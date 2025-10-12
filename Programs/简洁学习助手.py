
import tkinter as tk
import tkinter.messagebox as mb
import jieba.analyse
import matplotlib.pyplot as plt

# 预设样例
SAMPLES = {
    "英语短文": """
        Artificial intelligence is transforming education. Machine learning algorithms can personalize learning experiences for students. 
        Deep learning models analyze student performance data. Natural language processing enables intelligent tutoring systems. 
        Computer vision technology supports automated grading. These AI applications improve learning efficiency and outcomes.
    """,
    "语文短文": """
       春天来了，万物复苏。柳树抽出新的枝条，小草从土里探出头来。花儿竞相开放，红的像火，粉的像霞，白的像雪。
        小燕子从南方飞回来了，在天空中自由地飞翔。河水解冻了，叮叮咚咚地流着，像在唱着欢快的歌。
        田野里，农民伯伯开始春耕了，一派繁忙的景象。春天是一个充满希望的季节。
    """,
    "物理概念": """
        牛顿运动定律是经典力学的基础。第一定律说明了惯性的概念。第二定律建立了力与加速度的关系，公式为F=ma。
        第三定律阐述了作用力与反作用力的原理。万有引力定律解释了天体运动规律。
        能量守恒定律表明能量不会凭空产生或消失。这些定律构成了物理学的重要框架。
    """
}

root = tk.Tk()
root.title('简洁学习助手')
root.geometry('650x450')

keywords = []

def load_sample():
    sample = var.get()
    if sample not in SAMPLES:
        mb.showwarning('提示', '请选择一个样例类型')
        return
    text.delete(1.0, tk.END)
    text.insert(tk.END, SAMPLES[sample])

def extract():
    global keywords
    content = text.get(1.0, tk.END).strip()
    if not content:
        mb.showwarning('提示', '请输入或者加载样例内容')
        return
    keywords = jieba.analyse.extract_tags(content, topK=6, withWeight=True)
    result.delete(1.0, tk.END)
    result.insert(tk.END, '【核心概念 / 重点词汇】\n')
    for w, wgt in keywords:
        result.insert(tk.END, f'• {w} ')

def mindmap():
    if not keywords:
        mb.showwarning('提示', '请先提取重点')
        return
    words = [w[0] for w in keywords]
    weights = [w[1] for w in keywords]
    plt.figure(figsize=(5, 5))
    plt.pie(weights, labels=words, autopct='%1.1f%%', startangle=140)
    plt.title('学习重点分布', fontsize=14)
    plt.show()

def cards():
    if not keywords:
        mb.showwarning('提示', '请先提取重点')
        return
    result.delete(1.0, tk.END)
    result.insert(tk.END, '复习卡片（问答模式）\n\n')
    for i, (w, _) in enumerate(keywords, 1):
        result.insert(tk.END, f'Q{i}：什么是 “{w}”？\n')
        result.insert(tk.END, f'A{i}：\n\n')

def save():
    if not keywords:
        mb.showwarning('提示', '没有内容可保存')
        return
    with open('学习报告.txt', 'w', encoding='utf-8') as f:
        f.write('===== 简洁学习助手报告 =====\n')
        f.write('核心概念：\n')
        for w, wgt in keywords:
            f.write(f'- {w}\n')
    mb.showinfo('成功', '已保存为 “学习报告.txt”')

# —————— 界面布局 ——————
top = tk.Frame(root)
top.pack(pady=8)

tk.Label(top, text='选择样例：').pack(side=tk.LEFT)
var = tk.StringVar(value='选择样例')
tk.OptionMenu(top, var, *SAMPLES.keys()).pack(side=tk.LEFT, padx=5)
tk.Button(top, text='加载样例', command=load_sample, bg='#e0e0e0').pack(side=tk.LEFT)

tk.Label(root, text='学习内容（可以修改）：').pack()
text = tk.Text(root, height=9, width=70)
text.pack()

btn_bar = tk.Frame(root)
btn_bar.pack(pady=6)
tk.Button(btn_bar, text='提取重点', command=extract, width=10, bg='#d1e7ff').pack(side=tk.LEFT, padx=4)
tk.Button(btn_bar, text='生成导图', command=mindmap, width=10, bg='#d1e7ff').pack(side=tk.LEFT, padx=4)
tk.Button(btn_bar, text='复习卡片', command=cards, width=10, bg='#d1e7ff').pack(side=tk.LEFT, padx=4)
tk.Button(btn_bar, text='保存结果', command=save, width=10, bg='#d1e7ff').pack(side=tk.LEFT, padx=4)

tk.Label(root, text='分析结果：').pack()
result = tk.Text(root, height=10, width=70)
result.pack()

root.mainloop()