// Frozen pre-review implementation (copied from review/baseline-source.zip).
export function baselineCommand(input) {
 const t=input.toLowerCase().replace(/[\s，。！？、,.!?]/g,'');
 if (/停下|停止|别动|別動|不要动|不要動|休息|stop/.test(t)) return 'stop';
 if (/不要|别|別|不用/.test(t)) return null;
 if (/回来|回來|回去|归位|歸位|回家/.test(t)) return 'home';
 if (/过来|過來|来这里|來這裡|到我这|到我這|come/.test(t)) return 'come';
 if (/摇尾|搖尾|摆尾|擺尾|wag/.test(t)) return 'wag';
 if (/跳|jump/.test(t)) return 'jump';
 if (/跑|run/.test(t)) return 'run';
 if (/走|散步|walk/.test(t)) return 'walk';
 return null;
}
