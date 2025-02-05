namespace algebra_ts {
//
function makeAdd(trms : Term[]) : App {
    return new App(operator("+"), trms.slice());
}

export function transpose(app : App, term : Term){
    assert(app.isEq() && app.args.length == 2);

    const origin_idx = range(2).find(i => app.args[i].includesTerm(term))!;
    assert(origin_idx != undefined);

    const destination_idx = 1 - origin_idx;
    
    const [origin, destination] = [origin_idx, destination_idx].map(i => app.args[i]);

    if(origin == term){
        app.setArg(ConstNum.zero(), origin_idx);
    }
    else if(origin.isAdd()){
        assert(term.parent == origin);
        term.remArg();
    }
    else{
        throw new MyError();
    }

    term.changeSign();
    
    if(destination.isAdd()){

        (destination as App).addArg(term);
    }
    else {

        const add = makeAdd([destination, term]);
        app.setArg(add, destination_idx);
    }
}
}