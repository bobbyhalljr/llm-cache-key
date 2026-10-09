from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
p=Path(__file__).parent/'images'
B='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
R='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
def f(n,b=False):return ImageFont.truetype(B if b else R,n)
cyan='#53e2ed';violet='#b59aff';white='#f4f3ff';muted='#b5aacd'
def base(title,sub):
 im=Image.new('RGB',(1600,800)); px=im.load()
 for y in range(800):
  for x in range(1600):
   v=max(0,1-((x-1250)**2+(y-150)**2)**0.5/1400)
   px[x,y]=(int(12+18*v),int(10+7*v),int(26+36*v))
 d=ImageDraw.Draw(im)
 for x in range(40,1600,80):d.line((x,0,x,800),fill='#24203b')
 for y in range(0,800,80):d.line((0,y,1600,y),fill='#24203b')
 d.text((60,42),'BHJR / AI ENGINEERING / TYPESCRIPT',font=f(20,True),fill=cyan)
 d.text((60,98),title,font=f(43,True),fill=white)
 d.text((60,162),sub,font=f(24),fill=muted)
 return im,d
im,d=base('YOUR LLM CACHE KEY','Same prompt. Different user. Wrong answer.')
d.text((60,225),'IS MISSING HALF',font=f(72,True),fill=white)
d.text((60,308),'THE REQUEST.',font=f(72,True),fill=cyan)
for i,(title,body) in enumerate([('IDENTITY','tenant + principal + access revision'),('CONTRACT','model + messages + schema'),('STATE','knowledge + tools + decoding')]):
 x=60+i*500
 d.rounded_rectangle((x,455,x+460,645),radius=20,fill='#211a36',outline=violet,width=2)
 d.text((x+24,485),title,font=f(28,True),fill=cyan)
 # wrapped lines
 words=body.split(' + ')
 for j,line in enumerate(words):d.text((x+24,530+j*30),line,font=f(23),fill=white)
d.text((60,721),'16 fixture checks / no API key / no model call',font=f(27),fill=muted)
im.save(p/'cover.png')
im,d=base('A hit can be the bug','Both users ask: What is my refund limit?')
for x,title,lines,color in [(60,'PROMPT-ONLY KEY',['Acme / Alice writes: 500','Beta / Bob asks same text','Cache returns: ACME_LIMIT=500','Wrong scope. Successful lookup.'],'#f6a1c5'),(820,'VERSIONED KEY',['Acme / Alice writes: 500','Beta / Bob has a different key','Cache returns: MISS','Fetch an authorized result.'],cyan)]:
 d.rounded_rectangle((x,250,x+720,640),radius=22,fill='#211a36',outline=color,width=3)
 d.text((x+30,285),title,font=f(32,True),fill=color)
 for j,line in enumerate(lines):d.text((x+30,360+j*58),line,font=f(26),fill=white)
d.text((60,715),'Invented policy values. This is a cache-key fixture, not a real customer incident.',font=f(24),fill=muted)
im.save(p/'cross-tenant.png')
im,d=base('Key the request you actually execute','Fixed-position JSON tuple -> SHA-256 -> cache lookup')
for i,(title,lines) in enumerate([('TRUSTED SCOPE',['Tenant + principal','Access revision','From server authentication']),('REQUEST CONTRACT',['Model + snapshot','System + ordered messages','Exact output schema']),('DEPENDENCIES',['Tools + knowledge versions','Temperature + top-p','Token cap + seed'])]):
 x=60+i*500
 d.rounded_rectangle((x,270,x+460,605),radius=22,fill='#211a36',outline=cyan,width=3)
 d.text((x+25,308),title,font=f(28,True),fill=cyan)
 for j,line in enumerate(lines):d.text((x+25,389+j*53),line,font=f(22),fill=white)
d.text((60,677),'Hashing compresses the identity. It does not authorize the read or encrypt the data.',font=f(25),fill=white)
d.text((60,729),'Exact schema bytes: formatting changes create conservative misses.',font=f(23),fill=muted)
im.save(p/'key-contract.png')
im,d=base('TTL is not permission revocation','Fixture TTL: 1,000 ms. Write time: 0 ms.')
for i,(title,lines) in enumerate([('999 ms',['Same scope + same contract','ACME_LIMIT=500','Still inside TTL']),('1,000 ms',['Same scope + same contract','MISS','Expired at the boundary']),('1 ms + new ACL',['accessRevision: acl-8','MISS','New key before TTL expires'])]):
 x=60+i*500
 d.rounded_rectangle((x,280,x+460,602),radius=22,fill='#211a36',outline=violet,width=3)
 d.text((x+25,316),title,font=f(28,True),fill=cyan)
 for j,line in enumerate(lines):d.text((x+25,395+j*53),line,font=f(23),fill=white)
d.text((60,697),'The application must supply a fresh, trusted access revision on every read.',font=f(27),fill=white)
d.text((60,745),'Fixture revisions are constants. No authentication service is tested here.',font=f(23),fill=muted)
im.save(p/'ttl-revocation.png')
print('Saved cover and 3 diagrams, 1600 x 800.')
