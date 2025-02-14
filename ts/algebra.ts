namespace algebra_ts {
//

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

export function addEquations(sides_arg : Term[]) {
    const sides : Term[] = [];
    for(const side of sides_arg){
        if(side.parent == null || !side.parent.isEq()){
            throw new MyError();
        }

        const [equation, side_cp] = side.cloneRoot();
        sides.push(side_cp);
    }

    const new_sides = [ makeAdd([]), makeAdd([]) ];

    for(const side1 of sides){
        if(side1.parent == null || !side1.parent.isEq()){
            throw new MyError();
        }

        const idx1 = side1.parent.args.indexOf(side1);
        check(idx1 != -1);

        const idx2 = 1 - idx1;
        const side2 = side1.parent.args[idx2];

        new_sides[idx1].addArg(side1);
        new_sides[idx2].addArg(side2);
    }

    const eq = makeEq(new_sides);
    assert(eq.parent == null);
    eq.setParent(null);
    eq.verifyParent(null);
    
    return eq;
}
}