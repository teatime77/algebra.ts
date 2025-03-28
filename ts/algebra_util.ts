namespace algebra_ts {
//

export function makeAdd(trms : Term[]) : App {
    return new App(operator("+"), trms.slice());
}

export function makeMul(trms : Term[]) : App {
    return new App(operator("*"), trms.slice());
}

export function makeDiv(trms : Term[]) : App {
    return new App(operator("/"), trms.slice());
}

export function makeEq(trms : Term[]) : App {
    return new App(operator("=="), trms.slice());
}


export function getAllTerms(t : Term, terms: Term[]){
    terms.push(t);

    if(t instanceof App){
        assert(t.fnc != null, "get all terms");
        getAllTerms(t.fnc, terms);

        t.args.forEach(x => getAllTerms(x, terms));
    }
}

export function allTerms(trm : Term) : Term[] {
    const terms : Term[] = [];
    getAllTerms(trm, terms);

    return terms;
}

let hashMap : Map<string, bigint> ;

export function initHashTerm(){
    hashMap = new Map<string, bigint>();
}

function hashText(positions : number[], text : string) : bigint {
    const key = `${positions.join(".")}:${text}`
    let value = hashMap.get(key);
    if(value == undefined){
        if(hashMap.size < 64){

            value = 2n ** BigInt(hashMap.size);
        }
        else{

            value = BigInt(Math.random() * (2 ** 50));
        }
        // msg(`hash ${value.toString(2)} ${key}`);
        hashMap.set(key, value);
    }

    return value;
}

function hashRational(r : Rational) : string {
    if(r.denominator == 1){
        if(r.numerator == 1){
            return "";
        }
        else{
            return `${r.numerator}:`;
        }
    }
    else{
        return `${r.numerator}/${r.denominator}:`;
    }
}


export function setHashTerm(positions : number[], term : Term) : bigint {
    let hash : bigint;

    let value_str : string;
    if(positions.length == 0){
        value_str = "";
    }
    else{
        value_str = hashRational(term.value);
    }
    
    if(term instanceof ConstNum){

        hash = hashText(positions, value_str);
    }
    else if(term instanceof RefVar){
        hash = hashText(positions, value_str + term.name);
    }
    else if(term instanceof App){
        hash = hashText(positions, value_str + term.fncName);

        const positions_cp = positions.slice();
        if(term.isAdd() || term.isMul()){
            positions_cp.push(0);
            term.args.forEach(x => hash += setHashTerm(positions_cp, x));
        }
        else{
            for(const [idx, arg] of term.args.entries()){
                positions_cp.push(idx);

                hash += setHashTerm(positions_cp, arg);

                positions_cp.pop();
            }
        }
        
    }
    else{
        throw new MyError();
    }

    term.hash = hash;
    return term.hash;
}

function getTermByPointerEvent(map : Map<number,Term>, ev : PointerEvent) : Term {
    let target : HTMLElement = ev.target as HTMLElement;
    for(; target != null; target = target.parentElement as HTMLElement){
        if(target.id.startsWith("tex-term-")){

            const id_offset = "tex-term-".length;
            const id = parseInt(target.id.substring(id_offset));
            const term = map.get(id)!;
            assert(term != undefined);
            return term;
        }
    }

    throw new MyError();
}

export async function showTerm(speech : AbstractSpeech, root : Term){
    const map = makeIdToTermMap(root);
    allTerms(root).forEach(x => x.colorName = undefined);

    const span = document.createElement("span");
    span.style.height = "30px";
    span.style.cursor = "default";
    span.style.userSelect = "none";

    document.body.appendChild(span);

    await showFlow(speech, root, span);
    renderKatexSub(span, root.tex());

    let down_term : Term;
    let down_time : number;

    span.addEventListener("pointerdown", (ev : PointerEvent)=>{
        down_term = getTermByPointerEvent(map, ev);
        down_time = Date.now();
        msg(`down term [${down_term.str()}]`);
    });

    span.addEventListener("pointerup", (ev : PointerEvent)=>{
        const up_term = getTermByPointerEvent(map, ev);
        if(down_term == up_term){
            const elapsed_time = Date.now() - down_time;
            msg(`up term [${up_term.str()}] ${elapsed_time}`);

            up_term.colorName = (elapsed_time < 500 ? "blue" : "red");
            renderKatexSub(span, root.tex());
        }
    });

    (span.firstChild as HTMLElement).style.margin = "0";
}

export async function bodyOnLoad(){
    await i18n_ts.initI18n();

    const pre = document.getElementById("eqs") as HTMLPreElement;
    const text = pre.innerText.split("\n");
    const eqs  = text.map(x => x.trim()).filter(x => x != "")

    const speech = new Speech();
    // setPlayMode(PlayMode.fastForward);
    for(const eq of eqs){
        const term = parseMath(eq);

        const span = document.createElement("span");
        span.style.height = "30px";
        span.style.cursor = "default";
        span.style.userSelect = "none";
    
        document.body.appendChild(span);
    
        await simplify(speech, span, term);

        const hr = document.createElement("hr");
        document.body.appendChild(hr);
    }

    msg("algebra OK");
}

}