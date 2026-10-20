/* AI Running Coach 15.8.2 — deterministic on-device personalization.
 * No network, no stochastic training, no external model. Future results are
 * used only as labels, never to create the prediction features of an earlier run.
 */
(function(root){
'use strict';
const BASE=Object.freeze({paceWeights:[.58,.24,.12,.06],loadWeights:[.40,.38,.14,.08],threshold:82,paceRate:.0065,loadPositiveRate:.012,loadNegativeRate:.025});
const LIMITS={paceRate:[.0035,.009],loadPositiveRate:[.006,.016],loadNegativeRate:[.025,.03],threshold:[78,86]};
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const number=(x,def)=>finite(x)?x:def;
const copyBase=()=>({paceWeights:[...BASE.paceWeights],loadWeights:[...BASE.loadWeights],threshold:BASE.threshold,paceRate:BASE.paceRate,loadPositiveRate:BASE.loadPositiveRate,loadNegativeRate:BASE.loadNegativeRate});
function weights(w,base){
 if(!Array.isArray(w)||w.length!==4||w.some(x=>!finite(x)))return [...base];
 const arr=w.map((x,i)=>clamp(x,Math.max(.015,base[i]-.12),Math.min(.8,base[i]+.12)));
 const total=arr.reduce((a,b)=>a+b,0);
 if(total<=0)return [...base];
 return arr.map(v=>v/total);
}
function normalizeParams(input){
 const p=input||{};return {
  paceWeights:weights(p.paceWeights,BASE.paceWeights),loadWeights:weights(p.loadWeights,BASE.loadWeights),
  threshold:clamp(number(p.threshold,BASE.threshold),...LIMITS.threshold),
  paceRate:clamp(number(p.paceRate,BASE.paceRate),...LIMITS.paceRate),
  loadPositiveRate:clamp(number(p.loadPositiveRate,BASE.loadPositiveRate),...LIMITS.loadPositiveRate),
  loadNegativeRate:clamp(number(p.loadNegativeRate,BASE.loadNegativeRate),...LIMITS.loadNegativeRate)
 };
}
function normalizeState(raw){
 const p=raw&&typeof raw==='object'?raw:{};
 const history=(Array.isArray(p.history)?p.history:[]).filter(x=>x&&/^\d{4}-\d\d-\d\d$/.test(x.effectiveFrom||'')).map(x=>({effectiveFrom:x.effectiveFrom,trainedThrough:String(x.trainedThrough||''),params:normalizeParams(x.params),paceCases:clamp(Math.trunc(number(x.paceCases,0)),0,10000),loadCases:clamp(Math.trunc(number(x.loadCases,0)),0,10000),paceGain:number(x.paceGain,0),loadGain:number(x.loadGain,0)})).sort((a,b)=>a.effectiveFrom.localeCompare(b.effectiveFrom)).slice(-48);
 return {version:1,history,sourceRows:Array.isArray(p.sourceRows)?p.sourceRows.filter(x=>typeof x==='string').slice(-2000):[],paceCases:clamp(Math.trunc(number(p.paceCases,0)),0,10000),loadCases:clamp(Math.trunc(number(p.loadCases,0)),0,10000),paceGain:number(p.paceGain,0),loadGain:number(p.loadGain,0),status:history.length?'personalized':'baseline',lastTrainedThrough:typeof p.lastTrainedThrough==='string'?p.lastTrainedThrough:null,lastAttemptPaceAt:/^\d{4}-\d\d-\d\d$/.test(p.lastAttemptPaceAt||'')?p.lastAttemptPaceAt:null,lastAttemptLoadAt:/^\d{4}-\d\d-\d\d$/.test(p.lastAttemptLoadAt||'')?p.lastAttemptLoadAt:null};
}
function paramsAt(model,date){
 const h=(model?.history||[]).filter(x=>x.effectiveFrom<=date);
 return h.length?normalizeParams(h[h.length-1].params):copyBase();
}
function prediction(row,kind,p){
 const values=Array.isArray(row.features)?row.features:[];
 if(values.length!==4||values.some(x=>!finite(x)))return NaN;
 const w=kind==='pace'?p.paceWeights:p.loadWeights;
 let v=values[0];
 if(kind==='pace'&&row.quality&&finite(row.capability))v=clamp((row.capability-p.threshold)/18,-1,1);
 if(kind==='pace'&&!row.quality)v=values[0];
 return clamp(v*w[0]+values[1]*w[1]+values[2]*w[2]+values[3]*w[3],-1,1);
}
function validationScore(rows,kind,p){
 if(!rows.length)return Infinity;
 let total=0;for(const row of rows){const guess=prediction(row,kind,p);if(!finite(guess)||!finite(row.target))return Infinity;const err=guess-row.target;total+=err*err;}
 return total/rows.length;
}
function paramDistance(p,base,kind){
 const keys=kind==='pace'?'paceWeights':'loadWeights';
 return p[keys].reduce((s,v,i)=>s+Math.pow((v-base[keys][i])/.12,2),0)+(kind==='pace'?Math.pow((p.threshold-base.threshold)/4,2):0);
}
function candidates(base,kind){
 const out=[base],field=kind==='pace'?'paceWeights':'loadWeights';
 for(let i=0;i<4;i++)for(const delta of [-.04,-.02,.02,.04]){
  for(let j=0;j<4;j++)if(i!==j){const p=normalizeParams({...base,[field]:base[field].map((v,k)=>v+(k===i?delta:k===j?-delta:0))});out.push(p);}
 }
 if(kind==='pace')for(const threshold of [base.threshold-2,base.threshold-1,base.threshold+1,base.threshold+2])out.push(normalizeParams({...base,threshold}));
 return out;
}
function optimize(rows,kind,previous,cutoff=null){
 // Require multiple unique future dates, chronological training, untouched holdout.
 const all=rows.filter(x=>x&&/^\d{4}-\d\d-\d\d$/.test(x.outcomeDate||'')&&finite(x.target)&&Array.isArray(x.features)&&x.features.length===4&&x.features.every(finite)).sort((a,b)=>a.outcomeDate.localeCompare(b.outcomeDate)||String(a.anchorDate).localeCompare(String(b.anchorDate))).slice(-120);
 const uniq=new Set(all.map(x=>x.outcomeDate));
 const threshold=kind==='pace'?20:20;
 if(all.length<threshold||uniq.size<12)return {accepted:false,count:all.length,reason:'Not enough independent future outcomes'};
 const split=cutoff?all.findIndex(x=>x.outcomeDate>cutoff):Math.max(12,Math.floor(all.length*.7));
 const train=all.slice(0,split),holdout=all.slice(split);
 if(train.length<12||holdout.length<6||new Set(holdout.map(x=>x.outcomeDate)).size<4)return{accepted:false,count:all.length,reason:'Holdout too small'};
 const origin=copyBase();let best=origin;
 const baseLoss=validationScore(train,kind,origin);
 const score=p=>validationScore(train,kind,p)+.006*paramDistance(p,origin,kind);
 let bestTrain=score(origin);
 // Small, deterministic, regularized coordinate search. No random restarts.
 for(let pass=0;pass<2;pass++)for(const p of candidates(best,kind)){
  const loss=score(p);if(loss<bestTrain-1e-9){best=p;bestTrain=loss;}
 }
 const oosBase=validationScore(holdout,kind,origin),oosBest=validationScore(holdout,kind,best);
 const gain=finite(oosBase)&&oosBase>1e-10?(oosBase-oosBest)/oosBase:0;
 const trainImproved=bestTrain<baseLoss-0.0002;
 if(!(gain>=.08&&trainImproved&&oosBest<oosBase-0.001))return{accepted:false,count:all.length,gain,reason:'No validated improvement over baseline'};
 // Partial step back towards fixed conservative reference, max per-update change.
 const p=normalizeParams({...previous,[kind==='pace'?'paceWeights':'loadWeights']:(kind==='pace'?best.paceWeights:best.loadWeights).map((v,i)=>clamp(number(previous?.[kind==='pace'?'paceWeights':'loadWeights']?.[i],origin[kind==='pace'?'paceWeights':'loadWeights'][i])*.7+v*.3,origin[kind==='pace'?'paceWeights':'loadWeights'][i]-.09,origin[kind==='pace'?'paceWeights':'loadWeights'][i]+.09)),...(kind==='pace'?{threshold:number(previous?.threshold,82)*.7+best.threshold*.3}:{})});
 return {accepted:true,count:all.length,gain,params:p,holdout:holdout.length,reason:'Improved unseen follow-up predictions'};
}
function tuneRate(rows,kind,baseRate,cutoff=null){
 // Outcome is subsequent fractional efficiency change, or stable/adverse load response.
 const clean=rows.filter(x=>finite(x.targetRate)&&finite(x.confidence)&&x.confidence>0&&Array.isArray(x.features)&&x.features.length===4).slice(-120);
 if(clean.length<20)return{rate:baseRate,accepted:false};
 const split=cutoff?clean.findIndex(x=>x.outcomeDate>cutoff):Math.floor(clean.length*.7),train=clean.slice(0,split),test=clean.slice(split);
 if(train.length<12||test.length<6)return{rate:baseRate,accepted:false};
 const loss=(rs,scale)=>rs.reduce((s,r)=>{const signal=prediction(r,kind,copyBase()),rate=baseRate*scale;const pred=signal*r.confidence*rate;const e=pred-r.targetRate;return s+e*e;},0)/rs.length;
 const choices=[.75,.875,1,1.125,1.25];let best=1,bestLoss=loss(train,1);
 for(const scale of choices){const curr=loss(train,scale)+Math.pow(scale-1,2)*0.000001;if(curr<bestLoss){best=scale;bestLoss=curr;}}
 const baselineLoss=loss(test,1),newLoss=loss(test,best);
 if(best===1||!(newLoss<baselineLoss*.90)||!(baselineLoss-newLoss>1e-9))return{rate:baseRate,accepted:false};
 return{rate:baseRate*(1+(best-1)*.3),accepted:true,gain:(baselineLoss-newLoss)/baselineLoss};
}
function fit(pace,load,prior,cutoffs={}){
 const base=copyBase(),current=normalizeParams(prior||base),pa=optimize(pace,'pace',current,cutoffs.pace||null),lo=optimize(load,'load',current,cutoffs.load||null);
 let next={...current};if(pa.accepted)next={...next,paceWeights:pa.params.paceWeights,threshold:pa.params.threshold};
 if(lo.accepted)next={...next,loadWeights:lo.params.loadWeights};
 // Tune the three sensitivities independently; insufficient history never changes them.
 const pr=tuneRate(pace,'pace',BASE.paceRate,cutoffs.pace||null);
 if(pr.accepted&&pa.accepted)next.paceRate=clamp(.75*current.paceRate+.25*pr.rate,...LIMITS.paceRate);
 const plus=load.filter(x=>x.features[0]>=0),minus=load.filter(x=>x.features[0]<0);
 const lp=tuneRate(plus,'load',BASE.loadPositiveRate,cutoffs.load||null),ln=tuneRate(minus,'load',BASE.loadNegativeRate,cutoffs.load||null);
 if(lp.accepted&&lo.accepted)next.loadPositiveRate=clamp(.75*current.loadPositiveRate+.25*lp.rate,...LIMITS.loadPositiveRate);
 if(ln.accepted&&lo.accepted)next.loadNegativeRate=clamp(.75*current.loadNegativeRate+.25*ln.rate,...LIMITS.loadNegativeRate);
 return {params:normalizeParams(next),paceCases:pa.count,loadCases:lo.count,paceGain:pa.gain||0,loadGain:lo.gain||0,validatedPace:pa.accepted,validatedLoad:lo.accepted,rateUpdates:{pace:pr.accepted&&pa.accepted,loadPositive:lp.accepted&&lo.accepted,loadNegative:ln.accepted&&lo.accepted},status:pa.accepted||lo.accepted?'validated':'baseline'};
}
root.ARC_ADAPTIVE_LEARNING=Object.freeze({BASE,copyBase,normalizeParams,normalizeState,paramsAt,prediction,fit,optimize,tuneRate});
})(typeof window!=='undefined'?window:globalThis);
