import re,json,base64,os,io
from PIL import Image
s=open('src.html').read()
svg=open('velour-logo-3stars.svg').read()
inner=re.search(r'<g[^>]*>(.*)</g>',svg,re.S).group(1).replace('<path ','<path pathLength="1" ')
logo=f'<svg viewBox="0 0 1000 560" aria-hidden="true" focusable="false"><g fill="currentColor">{inner}</g></svg>'
s=s.replace('<!--LOGO-->',logo,1).replace('<!--LOGO-->',logo.replace('pathLength="1" ',''),1)
s=s.replace('<!--BIGLOGO-->',f'<svg class="fbig" viewBox="0 0 1000 560" role="img" aria-label="Velour"><g>{inner}</g></svg>')
I={}
for f in sorted(os.listdir('img2')):I[f[:-5]]='data:image/webp;base64,'+base64.b64encode(open('img2/'+f,'rb').read()).decode()
im=Image.open('velour-logo-3stars-gold.png').resize((1000,560),Image.LANCZOS);b=io.BytesIO();im.save(b,'PNG',optimize=True)
I['logo']='data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
s=s.replace('/*IMAGES*/{}',json.dumps(I)).replace('/*THREE_SRC*/',open('/home/user/pulse-volt/js/vendor/three.min.js').read())
open('index.html','w').write(s)
open('local.html','w').write(re.sub(r'<link rel="stylesheet" href="https://fonts.googleapis.com[^>]*>','<link rel="stylesheet" href="fonts.css">',s))
print(len(s)//1024,'KB')
