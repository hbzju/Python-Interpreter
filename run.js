var rules = {
    // skip white spaces
    whitespace: /[ ]+/,
    plus: /\+/,
    minus: /\-/,
    mul: /\*/,
    div: /\//,
    mod: /\%/,
    exp: /\*\*/,
    lbracket : /\(/,
    rbracket : /\)/,
    PI: /PI/,
    E: /E/,
    LT: /</,
    GT: />/,
    Assaign: /=/,
    NEQ : /!=/,
    LE: /<=/,
    GE: />=/,
    EQ: /==/,
    comma: /,/,
    colon: /:/,
    dot: /\./,
    LArray: /\[/,
    RArray: /\]/,
    LINECR: /\n\t+|\n[    ]+|\n/,//换行和缩进

    NUMBER: /^(\d+)(\.\d+)?/,
    IDENT:/[a-zA-Z]([a-zA-Z]|[0-9])*/,
    BOOLEAN:/True|False/,
    NONE:/None/,
    STRING: /['"].*?['"]/,
    and: /and/,
    or: /or/,
    IF: /if/,
    ELIF:/elif/,
    ELSE: /else/,
    WHILE: /while/,
    IN: /in/,
    FOR: /for/,
    DEF: /def/,
    PASS: /pass/,
    return: /return/
};

function run(){
    $('#output').val("");
    clean();
    //读文件
    // var fs= require('fs');  
    // var context = fs.readFileSync('test.py','utf-8');
    //Debug
    //普通：x = 0\nx=x+1\ny=5\n
    //条件：x=8\nif (x>9) :\n\tx=1\nelif(x==8):\n\tx=2\nelse:\n\tx=1+(1+1)\n\n\n
    //循环：x = 0\nwhile x>=5:\n\tx=x+1\ny=5\n
    //局部变量：x = 0\nz=0\nwhile x<5 :\n\tx=x+1\n\ty=12\n\tz=y/(1+2)\ny=5\n
    //函数：e=1\ndef a(x,y,z):\n\te = x+y+z\n\treturn e\ne=a(1,e,3)+7\n
    console.log('---------------- Lexicalize ----------------')
    context = $('#input').val();
    // var context = 'x=8\nif (x>9) :\n\tx=1\nelif(x==8):\n\tx=2\nelse:\n\tx=1+(1+1)\n\n\n';
    // console.log(context)
    // var lex = Lex.lex();
    lex.setTokens(rules);
    var tokens = lex.lexicalize(context);
    console.log(tokens);
    //词法分析
    console.log('---------------- Run ----------------')
    console.log("语法分析中...")
    // var parser = Parser.parser;
    var result = parser.parse(tokens);
    console.log('---------------- Traversal Ast ----------------')
    traversal(result);
    //语法分析
    console.log('---------------- Eval Ast ----------------')
    eval(result);
    // Eval.printVarStack();
}