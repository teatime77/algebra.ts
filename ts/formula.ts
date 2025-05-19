namespace algebra_ts {
//
const fetchText = i18n_ts.fetchText;
const isLetter = parser_ts.isLetter;
type  Path = parser_ts.Path;

class FormulaError extends Error {    
}

function actionRef(name : string) : RefVar {
    return new RefVar(name);
}

class Index {
    id       : number;
    assertion : App;

    constructor(id : number, assertion_str : string){
        this.id = id;
        this.assertion = parseMath(assertion_str) as App;
    }
}

class TermSelection{
    app : App;
    start : number;
    end   : number;

    constructor(app : App, start : number, end   : number){
        this.app   = app;
        this.start = start;
        this.end   = end;
    }
}

export abstract class Transformation {
    commandName : string;
    focus : Term;

    constructor(command_name : string, focus : Term){
        this.commandName     = command_name;
        this.focus           = focus;
    }
}


export class ApplyFormula extends Transformation {
    formulaId : number;
    formula_root_cp : App;
    sideIdx : number;
    dic : Map<string, Term>;

    constructor(focus : Term, formula_id : number , formula_root_cp : App, sideIdx : number, dic : Map<string, Term>){
        super("@apply_formula", focus);
        this.formulaId       = formula_id;
        this.formula_root_cp = formula_root_cp;
        this.sideIdx         = sideIdx;
        this.dic             = dic;
    }

    result() : App {
        return this.formula_root_cp;
    }

    getCommand(focus_path : Path) : App {
        const formula_id = new ConstNum(this.formulaId);
        const formula_side_idx         = new ConstNum(this.sideIdx);
        const formula_another_side_idx = new ConstNum(this.sideIdx == 0 ? 1 : 0);

        const cmd = new App(actionRef(this.commandName), [ focus_path, formula_id, formula_side_idx, formula_another_side_idx]);

        return cmd;
    }

    /**
     * 
     * @param dic 変換辞書
     * @param trm1 フォーカス側の項
     * @param trm2 公式側の項
     */
    matchTerm(dic : Map<string, Term>, fdic : Map<string, [App, Term]>, trm1 : Term, trm2 : Term){
        if(trm2 instanceof RefVar){
            // 公式側が変数参照の場合
    
            if(! isLetter(trm2.name[0])){
                // 公式側が演算子の場合

                if(! trm1.eq(trm2)){
                    // 等しくない場合

                    throw new FormulaError();
                }
            }
            else{
                // 公式側が変数の場合

                // 変換値
                const conv = dic.get(trm2.name);
        
                if(conv == undefined){
                    // 変換値が未定の場合
        
                    // 新しい変換値をセットする。
                    const trm1_cp = trm1.clone();

                    // 変換値を変数参照の係数で割る。
                    trm1_cp.value.setdiv(trm2.value);

                    dic.set(trm2.name, trm1_cp);
                }
                else{
                    // 変換値が既定の場合
        
                    if(! trm1.eq(conv)){
                        // 変換値と等しくない場合
        
                        throw new FormulaError();
                    }
                }
            }
        }
        else if(trm2 instanceof ConstNum){
            // 定数の場合
    
            if(! trm1.eq(trm2)){
                // 定数に等しくない場合
    
                throw new FormulaError();
            }
        }
        else if(trm2 instanceof App){
            // 公式側が関数呼び出しの場合
    
            if(trm1 instanceof App){
                // フォーカス側が関数呼び出しの場合

                if(trm2.fnc instanceof RefVar && trm2.fnc.isNamedFnc() && trm1.fnc.isOprFnc()){
                    // 公式側の関数が変数で、フォーカス側の関数が演算子の場合

                    // 変換値
                    const conv = fdic.get(trm2.fnc.name);
                    if(conv == undefined){
                        // 変換値が未定の場合
            
                        // 新しい変換値をセットする。
                        const trm1_cp = trm1.clone();
                        fdic.set(trm2.fnc.name, [trm2.clone(), trm1_cp]);
                    }
                    else{
                        // 変換値が既定の場合

                        // 公式側の関数呼び出しの文字表記と、変換値を得る。
                        const [trm2_cp, trm1_conv] = conv;

                        if(trm2.eq(trm2_cp)){
                            // 公式側の関数の引数が一致する場合

                            if(! trm1.eq(trm1_conv)){
                                // 変換値と等しくない場合
                
                                throw new FormulaError();
                            }        
                        }
                        else{
                            // 公式側の関数の引数が違う場合
            
                            // 未実装としてエラーにする。
                            throw new FormulaError();
                        }
                    }
                }
                else{

                    // 関数をマッチさせる。
                    this.matchTerm(dic, fdic, trm1.fnc, trm2.fnc);
        
                    if(trm1.args.length != trm2.args.length){
                        // 引数の数が等しくない場合
        
                        throw new FormulaError();
                    }
        
                    // それぞれの引数をマッチさせる。
                    for(const [i, t] of Array.from(trm2.args).entries()){
                        this.matchTerm(dic, fdic, trm1.args[i], t);
                    }

                    if(! trm1.value.eq(trm2.value) && trm1 != this.focus){
                        throw new FormulaError();
                    }
                }
            }
            else{
                // 関数呼び出しでない場合
    
                throw new FormulaError();
            }
        }
        else{
            assert(false);
        }
    }

    showCandidate(){        
    }
}

let Indexes : Index[] = [];
let curIndex : Index | undefined;

async function readFormulas(){
    Indexes = [];

    const text = await fetchText(`../data/formulas.txt`);
    const lines = text.split('\r\n').map(x => x.trim()).filter(x => x.length != 0);
    for(const line of lines){
        const i = line.indexOf(':');
        const id = parseInt( line.substring(0, i).trim() )!;
        const assertion_str = line.substring(i + 1).trim();

        const index = new Index(id, assertion_str);
        Indexes.push(index);
    }
}

export function substByDic(dic : Map<string, Term>, fdic : Map<string, [App, Term]>, root : App){
    const all_terms = allTerms(root);

    const apps = all_terms.filter(x => x instanceof App && fdic.has(x.fncName)) as App[];
    for(const trm2 of apps){
        const [trm2_cp, trm1_conv] = fdic.get(trm2.fncName)!;
        if(trm2.equal(trm2_cp)){
            // 公式側の関数呼び出しと一致する場合

            trm2.replaceTerm(trm1_conv.clone());
        }
        else{
            // 公式側の関数呼び出し違う場合

            // 未実装としてエラーにする。
            throw new FormulaError();
        }
    }

    const refs = all_terms.filter(x => x instanceof RefVar && dic.has(x.name)) as RefVar[];
    for(const ref of refs){
        const trm = dic.get(ref.name)!.clone();

        // 変換値に変数参照の係数をかける。
        trm.value.setmul(ref.value);

        // 変数参照を変換値で置き換える。
        ref.replaceTerm(trm);
    }
}



function matchFormulas(focus : Term, index : Index, form : App, side_idx : number , side : Term) : [ApplyFormula, App, App]  | [null, null, null]{
    if(focus instanceof App && side instanceof App){
        if(focus.fncName == side.fncName && focus.args.length == side.args.length){

            const [formula_root_cp, side_cp] = side.cloneRoot() as [App, App];

            const dic = new Map<string, Term>();
            const fdic = new Map<string, [App, Term]>();
            try{
                const trans = new ApplyFormula(focus, index.id, formula_root_cp, side_idx, dic);
                trans.matchTerm(dic, fdic, focus, side_cp);

                substByDic(dic, fdic, formula_root_cp);
                msg(`form : OK ${focus.str()} F:${formula_root_cp.str()}`);

                return [trans, formula_root_cp, side_cp];
            }
            catch(e){
                if(e instanceof FormulaError){

                    msg(`form : NG ${focus.str()} F:${form.str()}`);
                }
                else{
                    assert(false);
                }
            }
        }
    }

    return [null, null, null];
}

function enumFormulasForTermSelection(sel : TermSelection){

}

function enumFormulasForEquation(sel : TermSelection){

}

function enumFormulasForTerm(sel : TermSelection){

}

function enumFormulasForTerms(sel : TermSelection){

}

function enumFormulaCandidates(focus : Term){
    msg(`run: id:${focus.id} ${focus.constructor.name}`);

    for(const index of Indexes.filter(x => x != curIndex)){
        const form = index.assertion;
        assert(2 <= form.args.length);
        for(const [side_idx, side] of form.args.entries()){
            const [trans, formula_root_cp, side_cp] = matchFormulas(focus, index, form, side_idx , side);
            if(trans != null){
                trans.showCandidate();
            }
        }
    }
}














}