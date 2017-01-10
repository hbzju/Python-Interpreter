//基于LL(k)文法的语法分析器，生成一课Ast树
function AstNode(type, params)
{
	var node = {};
	node.type = type;
	node.child = {};
	for (item in params) {
		node.child[item] = params[item];
	}
	return node;
}

function Empty(){
	return AstNode('Empty');
}

//1.为了避免文法定义等出现问题而出现无限递归等情况，可以考虑规定递归层最多200层
//2.没有使用文法分析表，时间问题，不足以我完成这项工作
//3.为了避免一直出现this.method这样的调用，而且为了和终结符保持一致，程序的非终结符函数调用也用了tryMatch,但参数是字符串
var ERR = 'ERR';
var parser = {
	tokens:[],
	index:0,
	try:false,
	Error:function(){
		if (this.try && this.try < 200) return false;
		//可能会嵌套探测，探测过程中如果出现错误是不会当作Error的
		console.error("Unexpect token: " + this.tokens[this.index-1].text + ' ' + (this.index-1));
		process.exit();
	},
	match:function(tag){
		if (this.index < this.tokens.length && this.tokens[this.index].tag.match(tag)) {
			var node = AstNode(this.tokens[this.index].tag,{value:this.tokens[this.index].text});
			this.index = this.index + 1;
			return node;
		}
		else return false;
	},
	tryMatch:function(method){
		// console.log(method)
		if (this[method]==undefined) {
			return this.match(method);
		}
		//如果方法未定义，说明是正则表达式，则说明是终结符
		this.try++;
		//这个变量保证了不会在探测时直接被err
		var node = this[method]();
		this.try--;
		return node;
	},
	//match 是用来匹配终结符的
	//tryMatch是用来匹配非终结符的
	TryAst:function(methods){
		var sub = [];
		for (var i = 0; i < methods.length; i++) {
			var node = this.tryMatch(methods[i]);
			if (node == false) {
				// console.log(methods[i])
				return ERR;
			}
			else if (node != null) {
				sub.push(node);
			}
			else {
				sub.push(Empty())
			}
		}
		return sub;
		//尝试匹配后续结点，如果有一个是ERR的话，就
	},
	parse:function(tokens){
		this.tokens = tokens;
		var astRoot = this.start();
		if (this.index < this.tokens.length) {
			console.log(this.index);
			console.log(this.tokens[this.index])
			console.log("Err: 非法的输入.");
			return null;
		}
		return astRoot;
	},
	start:function(){
		return this.stmt();
	},
	stmt:function(){
		var left;
		if ( left = this.tryMatch('line') ) {
			if ( this.token >= this.tokens || this.tokens[this.index].tag == 'DEDENT') {
				//当到达缩进末尾的时候，应该终止stmt
				return AstNode('stmt',{left:left,right:Empty()});
			}
			var sub = this.TryAst([/CR/,'stmt']);
			if (sub == ERR) {
				// console.log(this.index)
				// console.log(this.tokens[this.index])
				return this.Error();
			}
			//如果只是试探呢？
			return AstNode('stmt',{left:left,right:sub[1]});
		}
		else if (left = this.tryMatch(/CR/) ){
			// console.log(this.index +" " + this.tokens.length)
			if (this.index < this.tokens.length) {
				var sub = this.TryAst(['stmt']);
				if (sub == ERR) {
					return this.Error();
				}
				//如果只是试探呢？
				return AstNode('stmt',{left:left,right:sub[0]});
			}
		}
		return null;
	},
	line:function(){
		var left;
		if (left = this.tryMatch('IDENT')) {
			//变量／函数／数组调用
			return this.Identifier(left);
		}
		else if (left = this.tryMatch(/IF/)) {
			//if 判定做的比较简单，一定要if开头，加上判断语句、一定要缩进
			//其实IF可以做二义性的，就是单行if，不要缩进，比较麻烦就不写了
			var sub = this.TryAst(['expr',/colon/,/INDENT/,'stmt','DEDENT',/CR/,'Else']);
			if (sub == ERR) {
				return this.Error();
			}
			return AstNode('IF',{left:sub[0],mid:sub[3],right:sub[6]});
		}
		else if (left = this.tryMatch(/WHILE/)) {
			//循环中的while和if很像，比较方便
			var sub = this.TryAst(['expr',/colon/,/INDENT/,'stmt','DEDENT']);
			if (sub == ERR) {
				return this.Error();
			}
			return AstNode('WHILE',{left:sub[0],right:sub[3]});
		}
		else if (left = this.tryMatch(/FOR/)) {
			//For循环的expr一定是个数组
			var sub = this.TryAst([/IDENT/,/IN/,'expr',/colon/,/INDENT/,'stmt','DEDENT']);
			if (sub == ERR) {
				return this.Error();
			}
			return AstNode('FOR',{left:sub[0],mid:sub[2],right:sub[5]});
		}
		else if (left = this.tryMatch(/DEF/)) {
			//函数定义
			var sub = this.TryAst([/IDENT/,/lbracket/,'para_list',/rbracket/,/colon/,/INDENT/,'stmt','DEDENT']);
			if (sub == ERR) {
				return this.Error();
			}
			return AstNode('FUNCDEF',{left:sub[0],para_list:sub[2],funcRoot:sub[6]});
		}
		else if (left = this.tryMatch(/return/)) {
			//函数定义
			var sub = this.TryAst(['expr']);
			if (sub == ERR) {
				return this.Error();
			}
			return AstNode('return',{left:sub[0]});
		}
		return null;
	},
	/* PxFunc和OpFunc用来避免重复的函数体 */
	OpFunc:function(pattern,tryList){
		var left;
		if (left = this.tryMatch(pattern)) {
			var sub = this.TryAst(tryList);
			if (sub == ERR) {
				return this.Error();
			}
			return AstNode('OpNode',{left:left,mid:sub[0],right:sub[1]});
		}
		return null;
	},
	PxFunc:function(pattern,tryList){
		var left;
		if (left = this.tryMatch(pattern)) {
			var sub = this.TryAst([tryList]);
			if (sub == ERR) {
				return this.Error();
			}
			return AstNode('PxNode',{left:left,right:sub[0]});
		}
		return false;
	},
	/* done */
	expr:function(){
		return this.PxFunc('PVExpr',['ORExpr']);
	},
	ORExpr:function(){ return this.OpFunc(/or/,['PVExpr','ORExpr']); },
	//与运算
	PVExpr:function(){ return this.PxFunc('PWExpr',['ANDExpr']); },

	ANDExpr:function(){ return this.OpFunc(/and/,['PWExpr','ANDExpr']); },
	//或运算
	PWExpr:function(){ return this.PxFunc('PXExpr',['RELExpr']); },

	RELExpr:function(){ return this.OpFunc(/EQ|NEQ|LE|GE|LT|GT/,['PXExpr','RELExpr']); },
	//逻辑运算
	PXExpr:function(){ return this.PxFunc('PYExpr',['LOExpr']); },

	LOExpr:function(){ return this.OpFunc(/plus|minus/,['PYExpr','LOExpr']); },
	//低级运算(Low Operation)
	PYExpr:function(){ return this.PxFunc('Meta',['HOExpr']); },

	HOExpr:function(){ return this.OpFunc(/mul|div|exp|mod/,['Meta','HOExpr']); },
	//或运算

	Meta:function(){
		var left;
		if (left = this.tryMatch('term')) 
			return left;
		else if (left = this.tryMatch(/IDENT/)) {
			return this.Identifier(left);
		}
		else if (left = this.tryMatch(/LArray/)) {
			//数组
			var sub = this.TryAst(['expr_list',/RArray/]);
			if (sub == ERR) {
				return this.Error();
			}
			return AstNode('Array',{left:sub[0]});
		}
		// else if (left = tryMatch(/{/)) {
		// 	//集合
		// 	var sub = this.TryAst(['expr',/,/,'expr_list']);
		// 	if (sub == ERR) {
		// 		return this.Error();
		// 	}
		// 	return AstNode('SET',{left:sub[0],right:sub[2]});
		// }
		else if (left = this.tryMatch(/lbracket/)) {
			//括号
			var sub = this.TryAst(['expr',/rbracket/]);
			if (sub == ERR) {
				return this.Error();
			}
			// return AstNode('Bracket',{value:sub[0]});
			return sub[0];//这里应该直接返回expr的值就好了
		}
		else if (left = this.tryMatch('-')) {
			//负数
			var sub = this.TryAst(['FExpr']);
			if (sub == ERR) {
				return this.Error();
			}
			return AstNode('UMINUS',{right:sub[0]});
		}
		return false;
	},
	term:function(){
		//可能可以并到expr里 FEXP
		return this.match(/NUMBER|STRING|NONE|BOOLEAN/);
	},
	Identifier:function(left){
		if (this.tryMatch(/Assaign/)) {
			var sub = this.TryAst(['expr']);
			if (sub == ERR) {
				return this.Error();
			}
			return AstNode('=',{left:left,right:sub[0]});
		}
		else if (this.tryMatch(/lbracket/)) {
			var sub = this.TryAst(['expr_list',/rbracket/]);
			if (sub == ERR) {
				return this.Error();
			}
			return AstNode('FUNCCALL',{left:left,right:sub[0]});
		}
		else if (this.tryMatch(/LArray/)) {
			//数组调用
			var sub = this.TryAst(['expr',/RArray/]);
			if (sub == ERR) {
				return this.Error();
			}
			return AstNode('ArrayCall',{left:left,right:sub[0]});
		}
		return left;
	},
	DEDENT:function(){
		if (this.index < this.tokens.length) {
			return this.match(/DEDENT/);
		}
		else if (this.index >= this.tokens.length) {
			return null;
		}
		return false;
	},
	Else:function(){
		//单独提取else是因为if可以作为line的开头，而else是不可以的
		var left;
		if (left = this.tryMatch(/ELIF/)) {
			var sub = this.TryAst(['expr',/colon/,/INDENT/,'stmt','DEDENT',/CR/,'Else']);
			if (sub == ERR) {
				return this.Error();
			}
			console.log(this.tokens[this.index])
			//这个直接用IF做结点名字就可以了
			return AstNode('IF',{left:sub[0],mid:sub[3],right:sub[6]});
		}
		else if (left = this.tryMatch(/ELSE/)) {
			var sub = this.TryAst([/colon/,/INDENT/,'stmt','DEDENT']);
			if (sub == ERR) {
				return this.Error();
			}
			return AstNode('ELSE',{left:sub[2]});
		}
		return null;
	},
	para_list:function(){
		var left;
		if (left = this.tryMatch(/IDENT/)) {
			if (this.tryMatch(/comma/)) {
				var sub = this.TryAst(['para_list']);
				if (sub == ERR) {
					return this.Error();
				}
				return AstNode('para_list',{left:left,right:sub[0]});
			}
			return AstNode('para_list',{left:left,right:Empty()});
		}
		return null;
	},
	expr_list:function(){
		var left;
		if (left = this.tryMatch('expr')) {
			if (this.tryMatch(/comma/)) {
				var sub = this.TryAst(['expr_list']);
				if (sub == ERR) {
					return this.Error();
				}
				return AstNode('expr_list',{left:left,right:sub[0]});
			}
			return AstNode('expr_list',{left:left,right:Empty()});
		}
		return null;
	}
}

//中序遍历
var traversal = function(astRoot){
	if (!astRoot || astRoot.type == 'Empty') {
		// console.log(astRoot);
		return;
	}
	var output = 'Type: ' + astRoot.type + ' | Son: ';
	for (item in astRoot.child) {
		var type = astRoot.child[item] == undefined ? undefined : astRoot.child[item].type;
		if(item != 'value')output += '{' + item + ': ' + type + '} ';
	}
	console.log(output);
	for (item in astRoot.child) {
		if(item != 'value')traversal(astRoot.child[item]);
	}
}
