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

    let ok = false;
    if(src instanceof RefVar){
        if(dst instanceof RefVar && src.name == dst.name){
            ok = true;
        }
    }
    else if(src instanceof App){
        if(dst instanceof App){

            const dst_app = dst as App;

            initHashTerm();
            setHashTerm([], src);
            setHashTerm([], dst_app);

            if(src.hash == dst_app.hash){
                // msg(`hash ${src.str2()}[${src.hash.toString(2)}] == ${dst_app.str2()}[${dst_app.hash.toString(2)}]`);
                assert(src.str2() == dst_app.str2());
                ok = true;
            }
            else{
                // msg(`hash ${src.str2()}[${src.hash.toString(2)}] != ${dst_app.str2()}[${dst_app.hash.toString(2)}]`)
            }
        }
        else if(dst.parent instanceof App){
            const dst_app = dst.parent;
            if(src.str2() == dst_app.str2()){
                ok = true;
            }
            else if(src.fncName == dst_app.fncName){
                initHashTerm();
                setHashTerm([], src);
                setHashTerm([], dst_app);
    
                const hashes = dst_app.args.map(x => x.hash);
                const strids = dst_app.args.map(x => x.strid());
                const terms : Term[] = [];
                for(const arg of src.args){
                    const hash  = arg.hash;
                    const strid = arg.strid();
                    const idx = strids.indexOf(strid);
                    if(idx == -1){
                        throw new MyError();
                    }

                    const idx2 = hashes.indexOf(hash);
                    assert(idx2 == idx);
                    msg(`hash idx ok:[${strid}] ${hash.toString(2)}`);
                    
                    terms.push(dst_app.args[idx]);
                    strids[idx] = "";
                    hashes[idx] = -1n;
                }
    
                for(const term of terms){
                    term.remArg();
                }
    
                dst_app.addArg(expr);

                return dstRoot;
            }
        }
    }

    if(ok){
        
        expr.value.setmul(dst.value);
        dst.replaceTerm(expr);

        return dstRoot;
    }

    throw new MyError();
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

    const eq_args = eq.args.slice();
    for(const arg of eq_args){
        const term_cp = term.clone();
        if(arg.isDiv()){
            const divisor = arg.divisor();
            mulTerm(divisor, term_cp);
        }
        else{
            const div = makeDiv([]);
            arg.replaceTerm(div);
            div.addArgs([arg, term_cp]);
        }
    }


    return eq;
}
}