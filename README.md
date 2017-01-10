#### 一、完成情况

​	主要完成了以下功能：

​	（1）基本赋值、逻辑运算、关系运算、计算等操作

​	（2）循环语句while、for

​	（3）条件语句if、elif、else

​	（4）函数声明及其调用，可存在多个参数

​	（5）数组的实现

​	（6）缩进代码块的实现，使用缩进来分隔条件、循环、函数的代码块

​	（7）实现了range、print等内置函数

​	解释器特点：

​	（1）完全自主编写，没有调用任何第三方库

​	（2）经仔细编写，封装了许多重复性高的函数，代码量较少，完成以上功能仅花费700行左右的代码。

​	（3）仅完成了一个较小的python子集，许多python的特性未能实现

​	使用方法：打开文件夹内的index.html文件，然后在第一个文本框内进行输入，由于此解释器在很多缩进等语法上存在限制，因此我给出了一些样例，您可以在解释器实现的语法范围内对代码进行，点击运行按钮显示正确的实现结果，如果运行Error，则不会显示结果，部分错误可以在控制台查看。

#### 二、实现思路

​	框架：Lex词法分析器＋递归下降的语法分析器＋AST的执行器。

​	具体实现思路：

**1.词法分析器**

​	词法分析器的实现比较简单，只需要根据用户输入的token的名称以及正则模式，来循环匹配源代码。如果当前代码开头的一个字符串能够被其中一个正则表达式匹配成功，就取出这个字符串，保存到一个数组中即可。

​	核心代码如下：

```javascript
//这里的tokens是用户定义的token的标签和正则表达式
for (var i = this.tokens.length - 1; i >= 0; i--) {
    tag = this.tokens[i].tag;
    pattern = this.tokens[i].pattern;
  	//取出代tokens中的标签和正则表达式
    match = context.match(pattern);
    //如果匹配成功，且匹配的位置就在当前位置则break
    if (match && match.index == 0) break;
    else if (match && match.index < pos) {
        match = null;
        continue;
    }
    //此方法性能较差，另一种可以参考的写法是只匹配一个字符，但是给出回调函数继续匹配
}
//跳出循环后将相应的文本和token压栈
```

​	因此源代码    ```x = 0\n```最终可以得到如下格式的token数据：

```javascript
[ { tag: 'IDENT', text: 'x' },
  { tag: 'Assaign', text: '=' },
  { tag: 'NUMBER', text: '0' },
  { tag: 'CR', text: '\n' } ]
```

​	附上部分定义的python语言的token的标签以及正则表达式：

```javascript
{
  NUMBER: /^(\d+)(\.\d+)?/,
  IDENT:/[a-zA-Z]([a-zA-Z]|[0-9])*/,
  BOOLEAN:/True|False/,
  NONE:/None/,
  STRING: /['"].*?['"]/,
    ...
}
```

**2.语法分析器**

​	语法分析部分是一个较容易手写的LL文法递归下降分析器。

​	首先，对python文法做出修改，经过了仔细编写文法之后，能够保证语法分析器要么不匹配当前token，要么匹配这个唯一的token，而这需要通过消除左递归、消除二义性、提取公因子来解决。

​	给出两个典型的语法片段：

```
1.条件语句的语法
(line是一段代码即stmt中的某一行，If语句必定在某一行开头，INDENT和DEDENT是缩进／出缩进)
line : 
	... 
	| if expr : INDENT stmt DEDENT Else stmt

Else :
	elif expr : INDENT stmt DEDENT Else 
	| else INDENT stmt DEDENT
	| ϵ

2.数学计算的语法
(P代表优先级，VWXYZ代表了优先级，LO、HO等表示低优先级＋－运算和高优先级＊／运算)
  expr -> PV OR
  OR -> || PV OR | ϵ
  //与运算
  PV -> PW AND
  AND -> && PW AND | ϵ
  //与运算
  PW -> PX REL
  REL -> logic PX REL | ϵ
  //关系
  PX -> PY LO
  LO -> + PY LO | - PY LO | ϵ
  //加减
  PY -> Meta HO
  HO -> *  HO | / Meta HO | ϵ
  //乘除
  Meta -> -Meta | id | (E)
  //元
  ----支持优先级、括号等
```

​	下面分别解释一下两段文法：

​	（1）在语法分析器进入line这个函数之后，会尝试匹配某些token，如果当前token是if的话，就会继续匹配后续的所有条件语句的文法。注意，在匹配if的时候，使用的是tryMatch函数，这意味着没有匹配到if没有关系，不会出错。但是在匹配到了if之后，后续所有的文法都必须被正确匹配，比如在expr之后，如果没有匹配到冒号“：”，就会报错，提示```Unexpected token： ‘:’```。

​	在if，如果正确匹配到了   ```expr : INDENT stmt DEDENT```，我们会进入Else函数，尝试匹配elif或else语句，这可以是尝试匹配，甚至仅仅匹配到空串（因为python允许这样的语法）。如果成功匹配elif和else这两个token之一，语法分析器就会继续完全匹配后续文法。

​	（2）expr文法的部分，我参考了一段网上的计算器文法的源码，但是只有+-*/，如下：

```javascript
  expr -> TE’
  E’ -> + TE’ | -TE’ | ϵ
  T -> FT’
  T’ -> * FT’ | / FT’ | ϵ
  F -> -F | id | (E)
```

​	代码非常直观，但如何引入其他的操作符和优先级呢？只要分析这段文法的模式，发现其实就是将不同的优先级通过了“优先级结点”和“运算结点”两种结点来进行计算，越靠近根结点的优先级结点会更晚进行运算。因此，类推其他语法，我进行了扩展，将expr运算分离成了前述文法。

​	其中，文法分析部分的代码复用性也非常高，只需要给出通用的优先级结点匹配函数和运算结点匹配函数，然后其他函数都重复使用即可。

```javascript
	/* PxFunc和OpFunc用来避免重复的函数体 */
	OpFunc:function(pattern,tryList){
      ...
	},
	PxFunc:function(pattern,tryList){
      ...
	},
	expr:function(){
		return this.PxFunc('PVExpr',['ORExpr']);
	},
	ORExpr:function(){ return this.OpFunc(/or/,['PVExpr','ORExpr']); },
	//与运算
	PVExpr:function(){ return this.PxFunc('PWExpr',['ANDExpr']); },
	...
    //其它运算类似使用，给出调用的匹配列表和函数即可
```

​	下面给出源代码```x = 0\n```的语法分析树：

```
Type: stmt | Son: {left: =} {right: Empty}
Type: = | Son: {left: IDENT} {right: PxNode}
Type: IDENT | Son:
Type: PxNode | Son: {left: PxNode} {right: Empty}
Type: PxNode | Son: {left: PxNode} {right: Empty}
Type: PxNode | Son: {left: PxNode} {right: Empty}
Type: PxNode | Son: {left: PxNode} {right: Empty}
Type: PxNode | Son: {left: NUMBER} {right: Empty}
Type: NUMBER | Son:
```

**3.执行器**

​	三个部分中，执行器的部分不算很难，只需要根据每个结点的token和数据，进行递归调用即可。主要的难点在于：变量的保存、函数的声明和调用。

​	变量的保存比较简单，每当读入一个IDENT的token，代表我们拿到了一个变量，那么我们去变量栈里面查找，如果找到了这个变量，就返回一个含有变量的值以及索引的对象，如果它被用来计算，那么就使用其中的值，而如果它被用来赋值，那么就使用其中的索引，来修改相应位置的变量栈结点。

​	编写执行器等时候，我忘了global语法，但却根据缩进实现了全局、局部变量的概念，这个概念是Javascript变量的概念，如果在上层缩进中定义了变量，该变量是有值的，而如果仅仅在某个缩进内定义了变量，这个变量的生命周期只能是这个缩进闭包内。

​	函数的声明和调用是生成语法树的主要原因（否则我们甚至可以在语法分析阶段直接执行），代码中一样提供了函数栈，栈内的每个结点保存的数据是：函数名、参数列表、子树根结点。和变量不一样，函数不应该保存一个具体的值，而是应该保存一颗子树的根结点，这方便我们在使用了函数的时候，才递归执行这颗子树。

​	而在调用的时候，也很方便，读入函数的名字和传入的参数的列表，如果参数数量不服，就需要报错，如果符合，就根据函数栈内参数列表保存的参数名，组合成一个变量IDENT，一一压入变量栈，那么函数的初始化就完成了，最后只需要解析子树就可以完成函数调用。

​	其中要注意的是，print、range等函数需要直接调用js代码给出结果。

​	

​	