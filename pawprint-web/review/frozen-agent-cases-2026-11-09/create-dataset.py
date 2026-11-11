"""One-time dataset authoring only; does not load code, predictions, or provider output."""
import json
from pathlib import Path

ZH = [
 ('direct','请走到我面前。',['come']), ('direct','回到你刚才出发的地方吧。',['home']),
 ('direct','我们在这里走一走吧。',['walk']), ('direct','现在请跑起来。',['run']),
 ('direct','你能摆一摆尾巴给我看吗？',['wag']), ('direct','请在原地跳一次。',['jump']),
 ('direct','现在请停止移动。',['stop']), ('indirect','到我旁边来陪着我，好吗？',['come']),
 ('indirect','我们一起活动一下腿，在房间里慢慢走吧。',['walk']), ('indirect','让我看看你跑得有多快。',['run']),
 ('negation','今天先不要跳。',['none','stop']), ('negation','别向我跑过来。',['none','stop']),
 ('negation','不必摇尾巴，安静就好。',['none','stop']), ('negation','这次不要散步，也不要跑。',['none','stop']),
 ('narrative','以前它总是绕着沙发跑，然后跳上垫子。',['none']), ('narrative','朋友刚才说“跑过来”，我只是转述。',['none']),
 ('narrative','假如明天不下雨，我们也许可以出去走走。',['none']), ('narrative','我记得它那时站在门口，尾巴摇得很快。',['none']),
 ('ordinary','你喜欢蓝色还是绿色？',['none']), ('ordinary','今天外面的云像一团棉花。',['none']),
 ('ordinary','你觉得这首歌听起来怎么样？',['none']), ('grief','我今天有点想念以前和它一起待着的下午。',['none']),
 ('grief','我不想说话，想安静看一会儿。',['none']), ('grief','房间安静下来时，我会想起它在身边的样子。',['none']),
 ('multi','先摇尾巴，然后请走到我面前。',['come']), ('multi','先跳一下，接着停下。',['stop']),
 ('multi','先慢慢走，最后请跑起来。',['run']), ('ambiguous','你愿意陪我吗？',[]),
 ('ambiguous','我们换个心情吧。',[]), ('ambiguous','这里有点冷清。',[]),
]
EN = [
 ('direct','Please approach my side of the screen.',['come']), ('direct','Return to your starting spot now.',['home']),
 ('direct','Take a slow stroll across the room.',['walk']), ('direct','Please start running now.',['run']),
 ('direct','Give your tail a little wag.',['wag']), ('direct','Do one jump in place, please.',['jump']),
 ('direct','Stop moving for a moment.',['stop']), ('indirect','Could you make your way over beside me?',['come']),
 ('indirect','Let us stretch our legs with a short stroll.',['walk']), ('indirect','Can you show me a quick sprint?',['run']),
 ('negation','Please do not leap this time.',['none','stop']), ('negation','No running toward me, please.',['none','stop']),
 ('negation','You do not need to wag your tail.',['none','stop']), ('negation','Neither walk nor run right now.',['none','stop']),
 ('narrative','My old dog used to run around the couch and jump on the rug.',['none']), ('narrative','My friend said “come over here” earlier; I am quoting her.',['none']),
 ('narrative','If it stays dry tomorrow, perhaps we could go for a stroll.',['none']), ('narrative','I remember her tail wagging while she waited by the door.',['none']),
 ('ordinary','Do you prefer a blue blanket or a green one?',['none']), ('ordinary','The clouds outside look like cotton today.',['none']),
 ('ordinary','What do you think of this piece of music?',['none']), ('grief','I miss the quiet afternoons I spent with her.',['none']),
 ('grief','I would rather not talk; I just want to watch quietly.',['none']), ('grief','When the room is quiet I think about how she used to be nearby.',['none']),
 ('multi','First wag your tail, then come over to me.',['come']), ('multi','Jump once, then stop moving.',['stop']),
 ('multi','Walk slowly first, and finally begin to run.',['run']), ('ambiguous','Would you like to keep me company?',[]),
 ('ambiguous','Let us change the mood a little.',[]), ('ambiguous','It feels a little empty in here.',[]),
]
FR = [
 ('direct','Approche-toi de mon côté de l’écran.',['come']), ('direct','Retourne à ton point de départ.',['home']),
 ('direct','Marche doucement dans la pièce.',['walk']), ('direct','Mets-toi à courir maintenant.',['run']),
 ('direct','Remue un peu la queue, s’il te plaît.',['wag']), ('direct','Fais un saut sur place.',['jump']),
 ('direct','Arrête de bouger un instant.',['stop']), ('indirect','Pourrais-tu venir te placer à côté de moi ?',['come']),
 ('indirect','Dégourdissons-nous les pattes avec une petite promenade.',['walk']), ('indirect','Peux-tu me montrer un petit sprint ?',['run']),
 ('negation','Ne saute pas cette fois-ci.',['none','stop']), ('negation','Ne cours pas vers moi, s’il te plaît.',['none','stop']),
 ('negation','Tu n’as pas besoin de remuer la queue.',['none','stop']), ('negation','Ne marche pas et ne cours pas maintenant.',['none','stop']),
 ('narrative','Avant, mon chien courait autour du canapé puis sautait sur le tapis.',['none']), ('narrative','Mon amie a dit « viens ici » tout à l’heure ; je la cite.',['none']),
 ('narrative','S’il fait beau demain, nous pourrions peut-être nous promener.',['none']), ('narrative','Je me souviens de sa queue qui remuait près de la porte.',['none']),
 ('ordinary','Tu préfères une couverture bleue ou verte ?',['none']), ('ordinary','Les nuages ressemblent à du coton aujourd’hui.',['none']),
 ('ordinary','Que penses-tu de cette musique ?',['none']), ('grief','Les après-midi tranquilles passés avec elle me manquent.',['none']),
 ('grief','Je ne veux pas parler ; je préfère regarder en silence.',['none']), ('grief','Quand la pièce est calme, je repense à sa présence.',['none']),
 ('multi','Remue d’abord la queue, puis approche-toi de moi.',['come']), ('multi','Saute une fois, puis arrête-toi.',['stop']),
 ('multi','Marche lentement d’abord, puis mets-toi à courir.',['run']), ('ambiguous','Tu veux bien me tenir compagnie ?',[]),
 ('ambiguous','Changeons un peu d’ambiance.',[]), ('ambiguous','Je trouve cette pièce un peu vide.',[]),
]

items=[]
for lang,rows in [('zh',ZH),('en',EN),('fr',FR)]:
 assert len(rows)==30
 for idx,(group,text,expected) in enumerate(rows,1):
  items.append({'id':f'{lang}-{idx:02d}','lang':lang,'group':group,'text':text.strip(),
                'allowedActions':expected,'scoring':'human-review' if group=='ambiguous' else 'automatic'})
assert len({item['text'] for item in items})==90
output={'schemaVersion':1,'date':'2026-11-09','author':'Codex subagent, AI-generated',
        'purpose':'Post-development exploratory action evaluation; not a human-created independent blind benchmark',
        'actionLabels':['none','come','home','walk','run','wag','jump','stop'],
        'items':items}
Path(__file__).with_name('cases.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
