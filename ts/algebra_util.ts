namespace algebra_ts {
//

export async function sleep(milliseconds : number) : Promise<void> {
    return new Promise((resolve) => {
        setTimeout(()=>{
            resolve();
        }, milliseconds);
    });
}

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

}