namespace algebra_ts {
//
/**
 * @param add 親の加算
 * @param add_child 子の加算
 * @description 加算の中の加算を、親の加算にまとめる。
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
 * @description 加算の中の同類項の係数をまとめる。
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

export function* simplify(root : Term){
    yield* simplifyNestedAddAll(root);
    yield* combineLikeTerms(root);
    yield root;
}

}