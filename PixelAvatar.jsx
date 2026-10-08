import React,{useEffect,useRef} from 'react';
import {drawAvatar,normalizeAvatar,SKINS,HAIRS,SHIRTS,PANTS} from './pixel-world.mjs';
export function PixelAvatar({avatar,size=120,direction='down'}){
 const ref=useRef(null);useEffect(()=>{const c=ref.current.getContext('2d');c.clearRect(0,0,48,64);drawAvatar(c,24,57,avatar,direction,0,2)},[avatar,direction]);
 return <canvas ref={ref} width={48} height={64} aria-label="Pixel lik" role="img" style={{width:size,height:size*4/3,imageRendering:'pixelated'}}/>;
}
export function AvatarEditor({value,onChange,en=false}){
 const a=normalizeAvatar(value),T=(b,e)=>en?e:b;
 const fields=[['skin',T('Ten','Skin tone'),SKINS],['hair',T('Boja kose','Hair colour'),HAIRS],['shirt',T('Majica','Top'),SHIRTS],['pants',T('Hlače','Trousers'),PANTS]];
 return <div className="psi-avatar-editor"><div className="psi-avatar-preview"><div className="psi-pixel-spark">✦</div><PixelAvatar avatar={a}/><span>{T('Tvoj lik, tvoj stil.','Your avatar. Your style.')}</span></div><div className="psi-avatar-options">{fields.map(([key,label,colors])=><fieldset key={key}><legend>{label}</legend><div className="psi-swatches">{colors.map((color,i)=><button type="button" key={color} aria-label={`${label} ${i+1}`} aria-pressed={a[key]===i} style={{'--swatch':color}} onClick={()=>onChange({...a,[key]:i})}><span/>{a[key]===i&&<b aria-hidden="true">✓</b>}</button>)}</div></fieldset>)}<fieldset><legend>{T('Frizura','Hair style')}</legend><div className="psi-style-options">{[T('Kratka','Short'),T('Duga','Long'),T('Kovrdže','Curls'),T('Kapa','Cap')].map((s,i)=><button key={s} type="button" aria-pressed={a.style===i} onClick={()=>onChange({...a,style:i})}>{s}</button>)}</div></fieldset></div></div>;
}
