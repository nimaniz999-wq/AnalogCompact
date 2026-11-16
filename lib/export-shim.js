/* آفلاین: ذخیرهٔ فایل، PDF و عکس بدون اینترنت و بدون API مخصوص Claude */
(function(){
  /* ---- ذخیرهٔ فایل با لینک دانلود معمولی ---- */
  window.__saveFile=function(name,data,type){
    var blob=data instanceof Blob?data:new Blob([data],{type:type||'application/octet-stream'});
    var u=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=u;a.download=name;a.rel='noopener';a.style.display='none';
    document.body.appendChild(a);a.click();
    setTimeout(function(){a.remove();URL.revokeObjectURL(u)},4000);
    return Promise.resolve(true);
  };
  /* ---- html2canvas سازگار، روی html-to-image ---- */
  window.html2canvas=function(el,o){
    o=o||{};
    return window.htmlToImage.toCanvas(el,{pixelRatio:o.scale||1,backgroundColor:o.backgroundColor||null,skipFonts:true,style:{position:'static',left:'0',top:'0',margin:'0'}});
  };
  /* ---- jsPDF سازگار (فقط بخش مورد استفاده) ---- */
  var SZ={a3:[841.89,1190.55],a4:[595.28,841.89],a5:[419.53,595.28],letter:[612,792],legal:[612,1008]};
  function jsPDF(o){
    o=o||{};var unit=o.unit||'mm',k=unit==='mm'?72/25.4:unit==='in'?72:unit==='cm'?72/2.54:1;
    var f=o.format,w,h;
    if(Array.isArray(f)){w=f[0]*k;h=f[1]*k}else{var s=SZ[String(f||'a4').toLowerCase()]||SZ.a4;w=s[0];h=s[1]}
    if(String(o.orientation||'p')[0]==='l'&&w<h){var t=w;w=h;h=t}
    this._k=k;this._w=w;this._h=h;this._pages=[[]];this._info={};
    var self=this;
    this.internal={pageSize:{getWidth:function(){return self._w/self._k},getHeight:function(){return self._h/self._k}}};
  }
  jsPDF.prototype.addPage=function(){this._pages.push([]);return this};
  jsPDF.prototype.setProperties=function(p){for(var n in p)this._info[n]=p[n];return this};
  jsPDF.prototype.addImage=function(data,fmt,x,y,w,h){
    var b=atob(String(data).split(',')[1]),u=new Uint8Array(b.length);
    for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);
    var px=0,py=0,nc=3,p=2;
    while(p<u.length){
      if(u[p]!==0xFF){p++;continue}
      var m=u[p+1];
      if(m>=0xC0&&m<=0xCF&&m!==0xC4&&m!==0xC8&&m!==0xCC){py=(u[p+5]<<8)|u[p+6];px=(u[p+7]<<8)|u[p+8];nc=u[p+9];break}
      p+=2+((u[p+2]<<8)|u[p+3]);
    }
    if(!px)throw new Error('JPEG only');
    this._pages[this._pages.length-1].push({u:u,px:px,py:py,nc:nc,x:x*this._k,y:y*this._k,w:w*this._k,h:h*this._k});
    return this;
  };
  jsPDF.prototype.output=function(type){
    var enc=new TextEncoder(),parts=[],len=0,offs=[];
    function add(x){var a=typeof x==='string'?enc.encode(x):x;parts.push(a);len+=a.length}
    function esc(s){return String(s).replace(/[\\()\r\n]/g,function(c){return c==='\\'?'\\\\':c==='('?'\\(':c===')'?'\\)':' '})}
    function obj(n,body){offs[n]=len;add(n+' 0 obj\n');add(body);add('\nendobj\n')}
    var np=this._pages.length,pw=this._w,ph=this._h,nid=4,ids=[];
    this._pages.forEach(function(imgs){var pg={page:nid++,cont:nid++,imgs:[]};imgs.forEach(function(){pg.imgs.push(nid++)});ids.push(pg)});
    add('%PDF-1.4\n');
    obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
    obj(2,'<< /Type /Pages /Kids ['+ids.map(function(g){return g.page+' 0 R'}).join(' ')+'] /Count '+np+' >>');
    var info='<< /Producer (Analog)';
    if(this._info.title)info+=' /Title ('+esc(this._info.title)+')';
    if(this._info.keywords)info+=' /Keywords ('+esc(this._info.keywords)+')';
    obj(3,info+' >>');
    for(var pi=0;pi<np;pi++){
      var g=ids[pi],imgs=this._pages[pi],xo='',c='';
      imgs.forEach(function(im,j){
        xo+='/I'+j+' '+g.imgs[j]+' 0 R ';
        c+='q '+im.w.toFixed(2)+' 0 0 '+im.h.toFixed(2)+' '+im.x.toFixed(2)+' '+(ph-im.y-im.h).toFixed(2)+' cm /I'+j+' Do Q\n';
      });
      obj(g.page,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+pw.toFixed(2)+' '+ph.toFixed(2)+'] /Resources << /XObject << '+xo+'>> >> /Contents '+g.cont+' 0 R >>');
      obj(g.cont,'<< /Length '+c.length+' >>\nstream\n'+c+'endstream');
      imgs.forEach(function(im,j){
        offs[g.imgs[j]]=len;
        add(g.imgs[j]+' 0 obj\n<< /Type /XObject /Subtype /Image /Width '+im.px+' /Height '+im.py+' /ColorSpace /'+(im.nc===1?'DeviceGray':'DeviceRGB')+' /BitsPerComponent 8 /Filter /DCTDecode /Length '+im.u.length+' >>\nstream\n');
        add(im.u);add('\nendstream\nendobj\n');
      });
    }
    var max=nid,xr=len;
    var xs='xref\n0 '+max+'\n0000000000 65535 f \n';
    for(var q=1;q<max;q++)xs+=('0000000000'+offs[q]).slice(-10)+' 00000 n \n';
    add(xs+'trailer\n<< /Size '+max+' /Root 1 0 R /Info 3 0 R >>\nstartxref\n'+xr+'\n%%EOF');
    var out=new Uint8Array(len),pos=0;parts.forEach(function(a){out.set(a,pos);pos+=a.length});
    return new Blob([out],{type:'application/pdf'});
  };
  jsPDF.prototype.save=function(name){return window.__saveFile(name||'document.pdf',this.output('blob'))};
  window.jspdf={jsPDF:jsPDF};
})();
