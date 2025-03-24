namespace algebra_ts {
//

/*
    x * c1 * c2 * y = (c1*c2) ・ x * y
*/
function* simplifyConstNumMultiplier(root : Term){
    // 引数に定数を含む乗算のリスト
    const const_muls = allTerms(root).filter(x => x.isMul() && (x as App).args.some(y => y instanceof ConstNum)) as App[];

    while(const_muls.length != 0){
        // 引数に定数を含む乗算に対し
        const mul = const_muls.pop()!;

        // 引数内の定数のリスト
        const nums = mul.args.filter(x => x instanceof ConstNum);

        // 乗算の係数に、引数内の定数の積をかける。
        nums.forEach(x => mul.value.setmul(x.value));

        // 引数内の定数を取り除く。
        nums.forEach(x => x.remArg());

        yield root;
    }
}

/**
 * @param add 親の加算
 * @param add_child 子の加算
 * @description 加算の中の加算を、親の加算にまとめる。
 * a + (b + c) = a + b + c
 */
function simplifyNestedAdd(add_child : App){
    const add : App = add_child.parent as App;
    assert(add != null && add.isAdd());

    // 引数の中の加算の位置
    const idx = add.args.indexOf(add_child);
    assert(idx != -1);

    // 引数の中の加算を削除する。
    add_child.remArg();

    // 引数の中の加算の引数に係数をかける。
    add_child.args.forEach(x => x.value.setmul(add_child.value));

    // 引数の中の加算の引数を元の加算の引数に入れる。
    add.insArgs(add_child.args, idx);
}


/**
 * 
 * @param root ルート
 * @description 加算の中の加算を、親の加算にまとめる。
 */
export function* simplifyNestedAddAll(root : Term) : Generator<Term>{
    msg("simplify-Nested-Add-All");

    // すべての加算のリスト
    const add_terms = allTerms(root).filter(x => x.isAdd()) as App[];

    while(add_terms.length != 0){
        // 未処理の加算がある場合

        const add = add_terms.pop()!;
        // msg(`root:${root.str()} add:[${add.str()}]`);

        while(true){
            // 加算の引数の中の加算を探す。
            const add_child = add.args.find(x => x.isAdd()) as App;
            if(add_child == undefined){
                // ない場合

                break;
            }
            root.verifyParent(root.parent);

            // 加算の中の加算を、親の加算にまとめる。
            // msg(`root1:${root.str()} add-child:[${add_child.str()}]`);
            simplifyNestedAdd(add_child);

            // msg(`root2:${root.str()}`);

            remove(add_terms, add_child, false);

            yield root;
        }
    }

    yield root;
}


/**
 * 
 * @param root ルート
 * @description 加算の中の引数の係数が同じならまとめる。
 * 
 * c x + c y = c (x + y)
 */
export function* simplifyCommonConstFactorInAdd(root : Term) : Generator<Term>{
    // すべての加算のリスト
    const add_terms = allTerms(root).filter(x => x.isAdd()) as App[];

    for(const add of add_terms){
        // 最初の項の係数
        const value = add.args[0].value;

        if(add.args.slice(1).every(x => x.value.eq(value))){
            // 次項以降も同じ係数の場合

            add.value.setmul(value);
            add.args.forEach(x => x.value.set(1));

            yield root;
        }
    }

    yield root;
}

/**
 * 
 * @param root ルート
 * @description 加算の中の同類項の係数をまとめる。
 * c1 x + c2 x = (c1 + c2) x
 */
export function* combineLikeTerms(root : Term) {
    // すべての加算のリスト
    const add_terms = allTerms(root).filter(x => x.isAdd()) as App[];

    while(add_terms.length != 0){
        // 未処理の加算がある場合

        const add = add_terms.pop()!;
        let idx = 0;
        const map = new Map<string, Term>();
        while(idx < add.args.length){
            const term = add.args[idx];
            assert(!term.isAdd());

            const str2 = term.str2();
            const like_term = map.get(str2);
            if(like_term == undefined){
                map.set(str2, term);
                idx++;
            }
            else{
                like_term.value.addRational(term.value);
                term.remArg();

                yield root;
            }
        }

        if(add.args.length == 1){
            add.oneArg();
        }
    }

    yield root;
}

/**
 * 
 * @param root ルート
 * @description 約分する。
 */
function* reduceFraction(root : Term){
    // すべての除算のリスト
    const div_terms = allTerms(root).filter(x => x.isDiv()) as App[];

    while(div_terms.length != 0){
        // 未処理の除算がある場合

        const div = div_terms.pop()!;
        const dividend = div.dividend();
        const divisor  = div.divisor();
        if(divisor instanceof ConstNum){

            if(dividend.isAdd()){

                const add = dividend as App;
                if(add.args.every(x => divisor.value.isDivisor(x.value))){
                    add.args.forEach(x => x.value.setdiv(divisor.value));
                    div.replaceTerm(add);

                    yield root;
                }
            }
            else{

                if(divisor.value.isDivisor(dividend.value)){
                    dividend.value.setdiv(divisor.value);
                    div.replaceTerm(dividend);

                    yield root;
                }
            }
        }
    }

    yield root;

}

export function* simplify(root : Term){
    root.verifyParent2();
    while(true){
        const strid = root.strid();
        yield* simplifyConstNumMultiplier(root);
        yield* simplifyNestedAddAll(root);
        yield* simplifyCommonConstFactorInAdd(root);
        yield* combineLikeTerms(root);
        yield* reduceFraction(root);
        yield root;

        if(strid == root.strid()){
            break;
        }
    }
    root.verifyParent2();

    yield root;
}

export async function callSimplifyFnc(speech : AbstractSpeech, fnc : (root: Term)=>Generator<parser_ts.Term, void, unknown>, root_init : Term){
    let strid = root_init.strid();
    for(const root of fnc(root_init)){

        let strid2 = root.strid();
        if(strid != strid2){
            await showTerm(speech, root);
            strid = strid2;
        }
    }
}

export async function showSimplify(speech : AbstractSpeech, root : Term){
    root.verifyParent2();

    await showTerm(speech, root);
    while(true){
        const strid = root.strid();

        await callSimplifyFnc(speech, simplifyConstNumMultiplier, root);
        await callSimplifyFnc(speech, simplifyNestedAddAll, root);
        await callSimplifyFnc(speech, simplifyCommonConstFactorInAdd, root);
        await callSimplifyFnc(speech, combineLikeTerms, root);
        await callSimplifyFnc(speech, reduceFraction, root);

        if(strid == root.strid()){
            break;
        }
    }
    root.verifyParent2();

    return root;
}



}