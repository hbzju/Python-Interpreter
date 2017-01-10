function lex(){
	var indentStack = new Array();
	indentStack.top = function(){
		return this[this.length-1];
		//返回栈顶元素
	}
	indentStack.push(0);
	//初始化缩进栈
	return {
		tokens:null,
		result:[],
		setTokens:function(tokens){
			var temp = new Array();
			for(item in tokens){
				temp.push({tag:item,pattern:tokens[item]})
			}
			this.tokens = temp;
		},
		lexicalize:function(context){
			var pos = 0;
			//预处理，去掉注释
			context = context.replace(/\/\*([\s\S]*)\*\//g,'');
			context = context + '\n';
			// context = context.replace(/ /g,'');

			while(context != ""){
				//转换为token
				var match = null;
				var tag = null;
				var pattern = null;
				for (var i = this.tokens.length - 1; i >= 0; i--) {
					tag = this.tokens[i].tag;
					pattern = this.tokens[i].pattern;

					match = context.match(pattern);
					//如果匹配成功，且匹配的位置就在当前位置则break
					if (match && match.index == 0) break;
					else if (match && match.index < pos) {
						match = null;
						continue;
					}
					//此方法性能较差，另一种可以参考的写法是只匹配一个字符，但是给出回调函数继续匹配
					//但这样用户需要定义的太多，而词法分析器的性能通常不是解释器需要考虑的东西
				}
				if (match) {
					//获得第一个匹配值在字符串的位置，这时
					if (tag == 'LINECR') {
						var yytext = match[0];
						var indent;
						if(yytext == '\n') indent = 0;
						else {
							text = yytext.substring(1).replace(/    /g,'\t');
							indent = yytext.length;
						}
						if (indentStack.top() > indent) {
							var count = 0;
							while(indentStack.top() > indent){
								indentStack.pop();
								count++;
							}
							while(count>1){
								this.result.push({
									tag:'DEDENT',
									text:'\n'
								});
								this.result.push({
									tag:'CR',
									text:'\n'
								});
								count--;
							}
							//如果退出了缩进，最好加一个换行符，因为DEDENT会被INDENT匹配，这会导致stmt失去换行符
							tag = 'DEDENT';
						}
						else if (indentStack.top() < indent) {
							indentStack.push(indent);
							tag = 'INDENT';
						}
						else tag = 'CR';
					}
					if (tag == 'STRING') {
						this.result.push({
							tag:tag,
							text:match[0].substring(1,match[0].length-1)
						});	
						//去掉头尾的引号
					}
					else if (tag != 'whitespace'){
						this.result.push({
							tag:tag,
							text:match[0]
						});
						if (tag == 'DEDENT') {
							this.result.push({
								tag:'CR',
								text:'\n'
							});
						}
					}
					pos = match[0].length;
					context = context.substr(pos);
				}
				else{
					console.error("Illegal character: " + context[0]);
					return null;
				}
			}
			return this.result;
		}
	}
}
var lex = lex();