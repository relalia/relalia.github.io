// One pairing rule for the report: absent scores are never converted to zero.
export function pairedSummary(rows, participant='vc') {
  const paired=rows.filter(r=>Number.isFinite(r.old[participant].total)&&Number.isFinite(r.new[participant].total));
  const n=paired.length;
  const oldSum=paired.reduce((s,r)=>s+r.old[participant].total,0);
  const newSum=paired.reduce((s,r)=>s+r.new[participant].total,0);
  return {oldSum,newSum,denominator:n,old:n?oldSum/n:null,new:n?newSum/n:null,delta:n?(newSum-oldSum)/n:null,
    up:paired.filter(r=>r.new[participant].total>r.old[participant].total).length,
    down:paired.filter(r=>r.new[participant].total<r.old[participant].total).length,
    same:paired.filter(r=>r.new[participant].total===r.old[participant].total).length};
}
export function parseJudge(text,mapping,mode) {
  const clean=s=>s.replaceAll('**','').trim();
  const table=text.split(/\r?\n/).filter(l=>l.startsWith('|')).map(l=>l.split('|').slice(1,-1).map(clean));
  const number=s=>{const n=clean(s??'').match(/^(\d+(?:[.,]\d+)?)(?:\/10)?$/);return n?Number(n[1].replace(',','.')):null;};
  const ab={};
  for(const [i,letter] of ['A','B'].entries()) {
    let criteria,total,classification;
    if(table[0][0]==='Resposta') {
      const row=table.find(r=>r[0]===letter);criteria=row.slice(1,4).map(number);total=number(row[4]);classification=row[5];
    }else{
      const col=table[0].length-2+i;
      criteria=table.filter(r=>/Conclusão|Fundamentação|Condições/.test(r[0])).map(r=>number(r[col]));
      total=number(table.find(r=>r[0].startsWith('Nota total'))?.[col]);classification=table.find(r=>r[0]==='Classificação')?.[col];
    }
    const sum=criteria.every(Number.isFinite)?criteria.reduce((a,b)=>a+b,0):null;
    ab[letter]={criteria,total,sum,classification};
  }
  const result=text.split(/\r?\n/).find(l=>/^(?:#{1,6}\s*)?(?:\*{0,2})?(?:[AB]\s+venceu|[Ee]mpate|[Vv]encedor[ae]?:)/.test(l));
  const winner=/A venceu|Vencedor[ae]?:.*Resposta A/i.test(result??'')?'A':/B venceu|Vencedor[ae]?:.*Resposta B/i.test(result??'')?'B':/empate/i.test(result??'')?'tie':'inconclusive';
  const vcLetter=mapping.A===mode?'A':'B';
  return {ab,vc:ab[vcLetter],opponent:ab[vcLetter==='A'?'B':'A'],vcLetter,result,winner:winner===vcLetter?'vc':winner==='tie'?'tie':winner==='inconclusive'?'inconclusive':'opponent'};
}
// Label offsets never move the actual data points. Leaders separate nearby values.
export function mainPlot(series) {
  const width=320,height=330,x=[67,253],labelX=[20,295],leaderX=[39,280],top=30,bottom=255;
  const y=value=>bottom-value/10*(bottom-top);
  const points=series.map(s=>s.values.map((value,i)=>({x:x[i],y:y(value),labelY:y(value)})));
  for(const column of [0,1]){
    const sorted=points.map((p,i)=>({p:p[column],i})).sort((a,b)=>a.p.y-b.p.y);
    let last=top-20;
    for(const {p} of sorted){p.labelY=Math.max(p.y,last+20);last=p.labelY;}
    if(last>bottom){const shift=last-bottom;for(const {p} of sorted)p.labelY-=shift;}
  }
  return {width,height,top,bottom,x,labelX,leaderX,points};
}
