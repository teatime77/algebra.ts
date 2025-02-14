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

}