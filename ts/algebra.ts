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

export function substitute(src_arg : Term, dst_arg : Term) : App {
    const [dstRoot, dst] = dst_arg.cloneRoot();
    const srcEq = src_arg.getRoot();
    assert(srcEq.args.length == 2);
    const sideIdx = src_arg.getRootEqSideIdx();
    const src = srcEq.args[sideIdx];

    const expr = srcEq.args[1 - sideIdx].clone();
    expr.value.setdiv(src.value);

    if(src instanceof RefVar){
        if(dst instanceof RefVar && src.name == dst.name){
            expr.value.setmul(dst.value);

            dst.replaceTerm(expr);
        }
        else{

            throw new MyError();
        }
    }
    else if(src instanceof App && dst.parent instanceof App){
        const dstApp = dst.parent;
        if(src.str2() == dstApp.str2()){

            expr.value.setmul(dst.value);

            dst.replaceTerm(expr);
        }
        else if(src.fncName == dstApp.fncName){
            const strids = dstApp.args.map(x => x.strid());
            const terms : Term[] = [];
            for(const arg of src.args){
                const strid = arg.strid();
                const idx = strids.indexOf(strid);
                if(idx == -1){
                    throw new MyError();
                }

                terms.push(dstApp.args[idx]);
                strids[idx] = "";
            }

            for(const term of terms){
                term.remArg();
            }

            dstApp.addArg(expr);
        }
        else{

            throw new MyError();
        }
    }

    return dstRoot;
}

export function mulTerm(multiplicand : Term, multiplier : Term) : App {
    let mul : App;

    if(multiplicand.isMul()){
        mul = multiplicand as App;
        mul.addArg(multiplier);
    }
    else{
        mul = makeMul([]);
        multiplicand.replaceTerm(mul);
        mul.addArgs([multiplicand, multiplier]);
    }

    return mul;
}

export function divideEquation(eq_arg : App, term : Term) : App {
    const eq = eq_arg.clone();
    assert(eq.isRootEq());

    for(const arg of eq.args){
        if(arg.isDiv()){
            const divisor = arg.divisor();
            mulTerm(divisor, term);
        }
        else{
            const div = makeDiv([]);
            arg.replaceTerm(div);
            div.addArgs([arg, term]);
        }
    }


    return eq;
}
}