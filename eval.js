var exprStack = [];
//操作数栈需要存储的情况：当前面的计算做完了，而后面还需要计算 (非空串)的时候
var para_list = [];
var expr_list = [];
expr_list_index = -1;
//变量列表栈，这个在每次函数定义的时候都会被重新初始化一遍

//变量栈
var varStack = [];
varStack[0] = [];

varStack.current = 0;

var clean = function(){
	expr_list_index = -1;
	varStack.current = 0;
	while(varStack.length)varStack.pop();
	varStack[0] = [];
	while(funcStack.length)funcStack.pop();
}

varStack.push = function(item){
	//该数组的push函数需要经过重载
	this[this.current].push(item);
}

varStack.find = function(name){
	var variable;
	for (var i = this.current ; i >= 0; i--) {
		//从local栈里一层层向外查找
		for (var j = varStack[i].length - 1; j >= 0; j--) {
			if(varStack[i][j].name == name)return {x:i,y:j, value:varStack[i][j].value};
		}
	}
	//如果没找到这个变量就压栈，设置为null
	varStack.push({name:name,value:null});
	return {x:this.current,y:varStack[this.current].length - 1, value:null};
}

var printVarStack = function(){
	console.log("变量栈：")
	console.log(varStack);
	console.log("函数栈：")
	console.log(funcStack);
}

//函数栈
var funcStack = [];
funcStack.push = function(name,para_list,funcRoot){
	//同样的函数栈的push需要经过重载
	for (var i = 0; i < para_list.length; i++) {
		for (var j = 0; j < para_list.length; j++) {
			if (i!=j&&para_list[i]==para_list[j]) {
				console.log(para_list[i] + '函数参数名重复定义！');
				process.exit();
			}
		}
	}
	for (var i = this.length - 1; i >= 0; i--) {
		if(this[i].name == name){
			console.log(name + '函数重复定义！');
			process.exit();
		}
	}
	this[this.length] = {
		name:name,
		para_list:para_list,
		funcRoot:funcRoot
	}
}

funcStack.find = function(name){
	for (var i = this.length - 1; i >= 0; i--) {
		if(this[i].name == name)return this[i];
	}
	console.log(name + '函数未定义！');
	process.exit();
}

//其它辅助函数
var indent = function(){
	varStack.current++;
	varStack[varStack.current]=[];
	//进入缩进部分的时候，要初始化一下该部分的变量栈
}

var dedent = function(){
	varStack[varStack.current]=null;
	varStack.current--;
	//出缩进后，变量栈清空
}

var doOperand = function(op,top,mid){
	var result;
	switch(op){
		case 'plus':result = top + mid;break;
		case 'minus':result = top - mid;break;
		case 'exp':result = Math.pow(top, mid);break;
		case 'mul':result = top * mid;break;
		case 'div':result = top / mid;break;
		case 'mod':result = top % mid;break;
		case 'EQ':result = top == mid;break;
		case 'NEQ':result = top != mid;break;
		case 'LT':result = top < mid;break;
		case 'GT':result = top > mid;break;
		case 'LE':result = top <= mid;break;
		case 'GE':result = top >= mid;break;
		case 'or':result = top || mid;break;
		case 'and':result = top && mid;break;
		default:break;
	}
	// console.log(op+' '+top+' '+mid+' '+result)
	return result;
} 

var copy = function(list){
	var newList = [];
	for (var i = list.length - 1; i >= 0; i--) {
		newList[i]=list[i];
	}
	return newList;
}

var tansfer = function(str){
	var transTable = [
		[/\\n/g,'\n'],
		[/\\r/g,'\r'],
		[/\\t/g,'\t'],
		[/\\\\/g,'\\'],
		[/\\\'/g,'\''],
		[/\\\"/g,'\"'],
		[/\\v/g,'\v']
	]
	for (var i = transTable.length - 1; i >= 0; i--) {
		str = str.replace(transTable[i][0],transTable[i][1]);
	}
	return str;
}

var outputToWeb = function(content){
	$('#output').val($('#output').val()+content);
}

//执行器
var eval = function(astRoot){
	if (!astRoot) {
		return;
	}
	// console.log(astRoot)
	var child = astRoot.child;
	var v,left,mid,right;
	switch(astRoot.type){
		case 'stmt':
			v = eval(child.left);
			if (child.left && child.left.type == 'return') break;
			v = eval(child.right);
			//如果return就是在最后的话，那就没事了
			break;
		case 'IDENT':
			v = varStack.find(child.value);
			break;
		case '=':
			left = eval(child.left);
			right = eval(child.right);
			varStack[left.x][left.y].value = right;
			v = varStack[left.x][left.y];
			break;
		case 'OpNode':
			//低优先级计算
			var op = child.left.type;
			mid = eval(child.mid);
			mid = (typeof mid) == 'object' ? mid.value : mid;
			var top = exprStack.pop();
			var result;
			result = doOperand(op,top,mid);
			exprStack.push(result);
			//先把左边和中间的算好
			right = eval(child.right);
			if (right == undefined) exprStack.pop();
			v = right ? right : result;
			break;
		case 'PxNode':
			//数学运算中的优先级结点
			left = eval(child.left);
			if ((typeof left) == 'object' && left.value != undefined) {
				left = left.value;
			}
			//如果是object说明是个变量，要转换成函数才能使右值
			exprStack.push(left);
			right = eval(child.right);
			if (right != undefined) {
				v = right;
			}
			else {
				v = left;
				exprStack.pop(v);
			}
			//如果后面的计算是空的，那就取左侧已计算好的，否则取后者，因为后者会继续计算
			break;
		case 'IF':
			indent();
			if (eval(child.left)) {
				v = eval(child.mid);
			}
			else {
				v = eval(child.right);
			}
			// v = child.later_stmt ? eval(child.later_stmt) : v;
			//根据后面的stmt是否为空来决定要不要做
			dedent();
			break;
		case 'ELSE':
			indent();
			v = eval(child.left);
			dedent();
			break;
		case 'WHILE':
			if (eval(child.left)) {
				v = eval(child.right);
				v = eval(astRoot);
			}
			// v = child.later_stmt ? eval(child.later_stmt) : v;
			//根据后面的stmt是否为空来决定要不要做
			break;
		case 'FOR':
			var range = eval(child.mid);
			var name = child.left.child.value;
			for (var i = 0; i < range.length; i++) {
				var item = range[i];
				indent();
				varStack.push({name:name,value:item});
				eval(child.right);
				dedent();
			}
			break;
		case 'FUNCDEF':
			var funcName = child.left.child.value;
			eval(child.para_list);
			funcStack.push(funcName,copy(para_list),child.funcRoot);
			para_list=[];//恢复para_list
			//不要做浅拷贝把数组copy走了
			break;
		case 'FUNCCALL':
			//函数调用
			expr_list_index++;
			expr_list[expr_list_index] = [];
			var funcName = child.left.child.value;
			eval(child.right);
			var elist = copy(expr_list[expr_list_index]);
			expr_list[expr_list_index] = null;
			expr_list_index--;
			switch(funcName){
				case 'print':
					var output = "";
					// console.log(elist)
					for (var i = 0; i < elist.length; i++) {
						output += elist[i];
					}
					outputToWeb(tansfer(output));
					// console.log(output)
					break;
				case 'range':
					if (elist.length != 2 && elist.length != 1) {
						outputToWeb('range 函数参数数量不匹配！');
						return;
					}
					if (elist.length == 1) {
						elist[1] = elist[0];
						elist[0] = 0;
					}
					if (elist[1] < elist[0]) {
						var temp = elist[0];
						elist[0] = elist[1];
						elist[1] = temp;
					}
					var array = [];
					for (var i = elist[0]; i <= elist[1]; i = i + 1) {
						array.push(i);
					}
					v = copy(array);
					break;
				default:
					var func = funcStack.find(child.left.child.value);
					indent();
					for (var i = 0; i < func.para_list.length; i++) {
						varStack.push({name:func.para_list[i],value:elist[i]});
					}
					v = eval(func.funcRoot);
					dedent();
			}
			break;
		case 'return':
			v = eval(child.left);
			v = v.value != undefined ? v.value : v;
			// console.log(v)
			break;
		case 'para_list':
			var para = child.left.child.value;
			para_list.push(para);
			eval(child.right);
			break;
		case 'expr_list':
			var data = eval(child.left);
			data = (typeof data) == 'object' ? data.value : data;
			expr_list[expr_list_index].push(data);
			eval(child.right);
			break;
		case 'Array':
			expr_list_index++;
			expr_list[expr_list_index] = [];
			eval(child.left);
			v = copy(expr_list[expr_list_index]);
			expr_list[expr_list_index] = null;
			expr_list_index--;
			break;
		case 'ArrayCall':
			var array = eval(child.left);
			v = array.value[eval(child.right)];
			break;
		case 'NUMBER':
			v = Number(child.value);
			break;
		case 'None':v = null;break;
		case 'BOOLEAN': v = child.value == 'True';break;
		case 'STRING': v = child.value;
		case 'Empty':
			break;
		default:
			return;
	}
	return v;
}

// exports.eval = eval;
// exports.printVarStack = printVarStack;