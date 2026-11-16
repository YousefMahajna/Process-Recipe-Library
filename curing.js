(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CuringProfile = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function array(v) { return Array.isArray(v) ? v : Object.keys(v || {}).sort(function(a,b){return Number(a)-Number(b);}).map(function(k){return v[k];}); }
  function round(v) { return Math.round(v * 1000) / 1000; }
  function number(v) { return v !== '' && v != null && Number.isFinite(Number(v)); }
  function read(c) {
    if (c.points !== undefined) return array(c.points).map(function(p){return {time:p.time,temp:p.temp,label:p.label || ''};});
    var segs = array(c.segments), t = c.startTime == null ? 0 : c.startTime;
    if (!segs.length) return [];
    var pts = [{time:t,temp:c.startTemp == null ? 25 : c.startTemp,label:'Start'}];
    segs.forEach(function(s){t = number(t) && number(s.min) ? Number((Number(t)+Number(s.min)).toFixed(12)) : '';pts.push({time:t,temp:s.temp,label:s.label || ''});});
    return pts;
  }
  function validate(pts) {
    if (pts.length === 1) throw new Error('A profile needs a start and an end point.');
    pts.forEach(function(p,i){
      if (!number(p.time) || Number(p.time)<0 || !number(p.temp) || Number(p.temp)<-273.15 || Number(p.temp)>3000) throw new Error('Point '+(i+1)+': enter a non-negative time and a temperature between -273.15 and 3000 °C.');
      if(i && Number(p.time)<=Number(pts[i-1].time)) throw new Error('Point times must increase from left to right. Each segment must have a positive duration.');
    }); return pts;
  }
  function write(c,pts) {
    c.points=pts.map(function(p){return {time:p.time,temp:p.temp,label:p.label || ''};});
    c.segments=pts.slice(1).map(function(p,i){var prev=pts[i];return {label:p.label || 'Segment '+(i+1),temp:p.temp,min:number(p.time)&&number(prev.time)?Number((Number(p.time)-Number(prev.time)).toFixed(12)):'',startTime:prev.time,endTime:p.time,startTemp:prev.temp,endTemp:p.temp};});
    c.startTime=pts.length?pts[0].time:0;c.startTemp=pts.length?pts[0].temp:25;
    return c;
  }
  function move(pts,i,time,temp,timeSnap,tempSnap) {
    timeSnap=Number(timeSnap)>0?Number(timeSnap):1;tempSnap=Number(tempSnap)>0?Number(tempSnap):1;
    var lo=i?Number(pts[i-1].time)+0.001:0,hi=i<pts.length-1?Number(pts[i+1].time)-0.001:Infinity;
    pts[i].time=round(Math.max(lo,Math.min(hi,Math.round(time/timeSnap)*timeSnap)));
    pts[i].temp=round(Math.max(-273.15,Math.min(3000,Math.round(temp/tempSnap)*tempSnap)));
    return pts;
  }
  function split(pts,i) {
    if(i<0||i>=pts.length-1)throw new Error('Select a segment to split.');
    var a=pts[i],b=pts[i+1],mid=round((Number(a.time)+Number(b.time))/2);
    if(mid<=Number(a.time)||mid>=Number(b.time))throw new Error('Segment is too short to split at 0.001-minute precision.');
    pts.splice(i+1,0,{time:mid,temp:round((Number(a.temp)+Number(b.temp))/2),label:'Split segment'});return pts;
  }
  function nice(v) { var power=Math.pow(10,Math.floor(Math.log10(Math.max(v,0.001)))),f=v/power;return (f<=1?1:f<=2?2:f<=5?5:10)*power; }
  function axisValues(pts) { return { times:Array.from(new Set(pts.map(function(p){return Number(p.time);}))).sort(function(a,b){return a-b;}), temps:Array.from(new Set(pts.map(function(p){return Number(p.temp);}))).sort(function(a,b){return b-a;}) }; }
  function element(tag,attrs,text) {var e=document.createElement(tag);Object.keys(attrs||{}).forEach(function(k){if(k==='onchange'||k==='onclick'||k==='oninput')e.addEventListener(k.slice(2),attrs[k]);else e.setAttribute(k,attrs[k]);});if(text!==undefined)e.textContent=text;return e;}
  function mount(c,editable,changed) {
    var pts=read(c),box=element('div',{'data-curing-widget':editable?'editor':'view'}),error=element('div',{class:'err',role:'alert'}),tableBox=element('div',{class:'scroll'}),chartBox=element('div',{});
    var setting=c.chart || {}, selected=0,drag=null,inputs=[],durations=[],settingsInputs=[];
    var W=920,H=350,L=78,R=28,T=34,B=58,scales=null;
    var svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 '+W+' '+H);svg.setAttribute('role','group');svg.setAttribute('aria-label','Curing time and temperature profile');svg.style.cssText='display:block;width:100%;height:auto;min-height:190px;touch-action:pan-y;margin-top:12px';chartBox.append(svg);
    function add(tag,attrs,text) {var n=document.createElementNS(svg.namespaceURI,tag);Object.keys(attrs).forEach(function(k){n.setAttribute(k,attrs[k]);});if(text!==undefined)n.textContent=text;svg.append(n);return n;}
    function bounds() {
      ['timeMax','timeStep','timeSnap','tempSnap'].forEach(function(k){if(setting[k]!==undefined&&setting[k]!==''&&(!number(setting[k])||Number(setting[k])<=0))throw new Error('Chart time range, intervals, and drag steps must be positive or Auto.');});
      ['tempMin','tempMax'].forEach(function(k){if(setting[k]!==undefined&&setting[k]!==''&&(!number(setting[k])||Number(setting[k])<-273.15||Number(setting[k])>3000))throw new Error('Temperature axis limits must be between -273.15 and 3000 °C.');});
      if(number(setting.tempMin)&&number(setting.tempMax)&&Number(setting.tempMin)>=Number(setting.tempMax))throw new Error('Temperature axis maximum must be above minimum.');
      var maxTime=Math.max(pts.length?0.001:10,...pts.map(function(p){return Number(p.time);})),temps=pts.map(function(p){return Number(p.temp);});
      var x=Math.max(maxTime,Number(setting.timeMax)||0),lo=Math.floor((Math.min(0,...temps)-10)/20)*20,hi=Math.ceil((Math.max(100,...temps)+10)/20)*20;
      lo=Math.max(-273.15,number(setting.tempMin)?Math.min(...temps,Number(setting.tempMin)):lo);hi=Math.min(3000,number(setting.tempMax)?Math.max(...temps,Number(setting.tempMax)):hi);
      if(hi<=lo){lo=Math.max(-273.15,hi-1);hi=Math.min(3000,lo+1);}
      var step=Number(setting.timeStep)>0?Number(setting.timeStep):nice(x/8);
      if(x/step>200)throw new Error('The time tick interval would create more than 200 divisions. Increase the interval or reduce the time-axis range.');
      return {max:x,lo:lo,hi:hi,step:step};
    }
    function paint() {
      svg.replaceChildren();
      try {validate(pts);var b=drag?drag.bounds:bounds();scales=b;error.textContent='';}
      catch(e){error.textContent=e.message;return;}
      function X(v){return L+Number(v)/b.max*(W-L-R);}function Y(v){return T+(b.hi-Number(v))/(b.hi-b.lo)*(H-T-B);}
      var exact=axisValues(pts),lanes=[],timeLabels=exact.times.map(function(t){var width=String(t).length*7+12,left=X(t)-width/2,lane=0;while(lanes[lane]!==undefined&&left<lanes[lane]+6)lane++;lanes[lane]=X(t)+width/2;return {value:t,lane:lane,width:width};});
      if(!drag){B=58+Math.max(0,lanes.length-1)*18;H=T+Math.max(258,(pts.length+1)*17)+B;svg.setAttribute('viewBox','0 0 '+W+' '+H);}
      var ystep=nice((b.hi-b.lo)/7);
      for(var y=Math.ceil(b.lo/ystep)*ystep;y<=b.hi;y+=ystep){add('line',{x1:L,x2:W-R,y1:Y(y),y2:Y(y),stroke:'var(--border)'});if(!exact.temps.some(function(temp){return Math.abs(Y(temp)-Y(y))<16;}))add('text',{x:L-10,y:Y(y)+4,'text-anchor':'end'},round(y));}
      var ticks=[];for(var x=0;x<=b.max+0.000001;x+=b.step)ticks.push(round(x));if(ticks[ticks.length-1]!==b.max)ticks.push(b.max);
      ticks.forEach(function(t){add('line',{x1:X(t),x2:X(t),y1:T,y2:H-B,stroke:'var(--border)','stroke-dasharray':'3 4'});if(!exact.times.some(function(time){return Math.abs(X(time)-X(t))<36;}))add('text',{x:X(t),y:H-B+24,'text-anchor':'middle'},round(t));});
      timeLabels.forEach(function(label){var t=label.value,axisY=H-B+24+label.lane*18,top=Math.min.apply(null,pts.filter(function(p){return Number(p.time)===t;}).map(function(p){return Y(p.temp);}));
        add('line',{x1:X(t),x2:X(t),y1:top,y2:axisY-11,stroke:'var(--chart)','stroke-dasharray':'4 4','stroke-opacity':0.55,'pointer-events':'none'});
        add('rect',{x:X(t)-label.width/2,y:axisY-12,width:label.width,height:16,rx:3,fill:'var(--surface)','pointer-events':'none'});
        add('text',{x:X(t),y:axisY,'text-anchor':'middle','data-axis-time':String(t),style:'fill:var(--accent);font-weight:700','pointer-events':'none'},String(t));
      });
      var tempLabels=exact.temps.map(function(t){return {value:t,y:Y(t)};});
      tempLabels.forEach(function(label,i){if(i)label.y=Math.max(label.y,tempLabels[i-1].y+16);});
      for(var j=tempLabels.length-1;j>=0;j--)tempLabels[j].y=Math.min(tempLabels[j].y,j===tempLabels.length-1?H-B:tempLabels[j+1].y-16);
      tempLabels.forEach(function(label){var t=label.value,far=Math.max.apply(null,pts.filter(function(p){return Number(p.temp)===t;}).map(function(p){return X(p.time);}));
        add('line',{x1:L,x2:far,y1:Y(t),y2:Y(t),stroke:'var(--chart)','stroke-dasharray':'4 4','stroke-opacity':0.55,'pointer-events':'none'});
        add('path',{d:'M '+L+' '+Y(t)+' L '+(L-5)+' '+label.y,fill:'none',stroke:'var(--chart)','pointer-events':'none'});
        add('text',{x:L-10,y:label.y+4,'text-anchor':'end','data-axis-temp':String(t),style:'fill:var(--accent);font-weight:700','pointer-events':'none'},String(t));
      });
      add('text',{x:L,y:16},'Temperature (°C)');add('text',{x:(W+L-R)/2,y:H-8,'text-anchor':'middle'},'Time (min)');
      add('polyline',{points:pts.map(function(p){return X(p.time)+','+Y(p.temp);}).join(' '),fill:'none',stroke:'var(--chart)','stroke-width':3,'stroke-linejoin':'round'});
      pts.forEach(function(p,i){
        var dot=add('circle',{cx:X(p.time),cy:Y(p.temp),r:editable?8:4,fill:i===selected&&editable?'var(--ok)':'var(--chart)',stroke:'var(--surface)','stroke-width':2,'data-point-index':i});
        var title=document.createElementNS(svg.namespaceURI,'title');title.textContent='Point '+(i+1)+': '+p.time+' min, '+p.temp+' °C';dot.append(title);
        if(editable){dot.setAttribute('tabindex','0');dot.setAttribute('role','slider');dot.setAttribute('aria-label','Profile point '+(i+1));dot.setAttribute('aria-valuemin',-273.15);dot.setAttribute('aria-valuemax',3000);dot.setAttribute('aria-valuenow',p.temp);dot.setAttribute('aria-valuetext',p.time+' minutes, '+p.temp+' degrees C');dot.style.cssText='cursor:grab;touch-action:none';
          dot.addEventListener('pointerdown',function(e){if(e.button!==0)return;selected=i;drag={index:i,bounds:bounds(),before:JSON.parse(JSON.stringify(pts))};svg.setPointerCapture(e.pointerId);e.preventDefault();paint();});
          dot.addEventListener('keydown',function(e){if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();var dt=Number(setting.timeSnap)||1,dy=Number(setting.tempSnap)||1;move(pts,i,Number(p.time)+(e.key==='ArrowLeft'?-dt:e.key==='ArrowRight'?dt:0),Number(p.temp)+(e.key==='ArrowDown'?-dy:e.key==='ArrowUp'?dy:0),dt,dy);selected=i;update();var next=svg.querySelector('[data-point-index="'+i+'"]');if(next)next.focus();});
        }
        if(i===selected&&editable)add('text',{x:Math.max(L+70,Math.min(W-R-70,X(p.time))),y:Math.max(24,Y(p.temp)-16),'text-anchor':'middle'},p.time+' min · '+p.temp+' °C');
      });
    }
    function update() {
      if(editable){write(c,pts);c.chart=setting;}
      inputs.forEach(function(b){if(document.activeElement!==b.input)b.input.value=pts[b.point][b.key];});
      durations.forEach(function(d){d.cell.textContent=number(pts[d.i].time)&&number(pts[d.i+1].time)?round(Number(pts[d.i+1].time)-Number(pts[d.i].time)):'—';});
      paint();if(changed)changed();
    }
    function field(value,label,oninput,type) {var input=element('input',{type:type||'number','aria-label':label,step:'any',oninput:oninput});input.value=value==null?'':value;return input;}
    function drawTable() {
      tableBox.replaceChildren();inputs=[];durations=[];
      if(pts.length<2){tableBox.append(element('div',{class:'sub'},'No segments. Add a segment to start a profile.'));return;}
      var table=element('table',{}),head=element('tr',{});['Segment','Start time (min)','End time (min)','Start °C','End °C','Duration (min)'].concat(editable?['Actions']:[]).forEach(function(label){head.append(element('th',{},label));});var thead=element('thead',{});thead.append(head);table.append(thead);var body=element('tbody',{});
      pts.slice(1).forEach(function(p,i){var row=element('tr',{}),label=element('td',{});
        if(editable)label.append(field(p.label,'Segment '+(i+1)+' name',function(e){p.label=e.target.value;update();},'text'));else label.textContent=p.label||'Segment '+(i+1);row.append(label);
        [[i,'time','start time'],[i+1,'time','end time'],[i,'temp','start temperature'],[i+1,'temp','end temperature']].forEach(function(binding){var td=element('td',{});if(editable){var input=field(pts[binding[0]][binding[1]],'Segment '+(i+1)+' '+binding[2],function(e){pts[binding[0]][binding[1]]=e.target.value===''?'':Number(e.target.value);update();});input.style.minWidth='100px';td.append(input);inputs.push({input:input,point:binding[0],key:binding[1]});}else td.textContent=pts[binding[0]][binding[1]];row.append(td);});
        var duration=element('td',{});durations.push({cell:duration,i:i});row.append(duration);
        if(editable){var action=element('td',{});action.append(element('button',{class:'small',onclick:function(){try{validate(pts);split(pts,i);drawTable();update();}catch(e){error.textContent=e.message;}}},'Split'),element('button',{class:'small danger',onclick:function(){pts.splice(i+1,1);if(pts.length===1)pts=[];selected=Math.max(0,Math.min(selected,pts.length-1));drawTable();update();}},'Remove'));row.append(action);}body.append(row);
      });table.append(body);tableBox.append(table);
    }
    if(editable){
      box.append(element('div',{class:'sub',style:'margin-bottom:12px'},'Drag points horizontally for time and vertically for temperature. Shared endpoints update both neighboring segments. Arrow keys move a focused point. Save to publish the profile.'));
      var controls=element('div',{class:'row noprint',style:'margin-bottom:12px'});
      [['timeMax','Time axis end (min)'],['timeStep','Time tick interval (min)'],['timeSnap','Drag time step (min)'],['tempSnap','Drag temperature step (°C)'],['tempMin','Temperature axis min (°C)'],['tempMax','Temperature axis max (°C)']].forEach(function(f){var wrap=element('div',{class:'field'}),id='curing-setting-'+f[0]+'-'+Math.random().toString(36).slice(2),label=element('label',{for:id},f[1]);var input=field(setting[f[0]],f[1],function(e){setting[f[0]]=e.target.value===''?'':Number(e.target.value);update();});input.id=id;input.placeholder='Auto';wrap.append(label,input);controls.append(wrap);settingsInputs.push(input);});box.append(controls);
    }
    box.append(chartBox,error,tableBox);
    if(editable)box.append(element('button',{class:'small',style:'margin-top:12px',onclick:function(){if(pts.length){try{validate(pts);}catch(e){error.textContent=e.message;return;}}else pts.push({time:0,temp:25,label:'Start'});var last=pts[pts.length-1];pts.push({time:round(Number(last.time)+10),temp:Number(last.temp),label:'Segment '+pts.length});selected=pts.length-1;drawTable();update();}},'+ Add segment'));
    svg.addEventListener('pointermove',function(e){if(!drag)return;var point=svg.createSVGPoint();point.x=e.clientX;point.y=e.clientY;var at=point.matrixTransform(svg.getScreenCTM().inverse()),b=drag.bounds;move(pts,drag.index,(at.x-L)/(W-L-R)*b.max,b.hi-(at.y-T)/(H-T-B)*(b.hi-b.lo),setting.timeSnap,setting.tempSnap);update();});
    svg.addEventListener('pointerup',function(e){if(!drag)return;drag=null;if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);update();});
    svg.addEventListener('pointercancel',function(){if(drag){pts=drag.before;drag=null;update();}});
    drawTable();if(editable)write(c,pts);update();return box;
  }
  return { read:read,write:write,validate:validate,move:move,split:split,mount:mount,axisValues:axisValues };
});
