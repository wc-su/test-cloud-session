(() => {
  const resultEl = document.getElementById('result');
  const expressionEl = document.getElementById('expression');
  const keys = document.querySelector('.keys');

  const SYMBOLS = { '+': '+', '-': '−', '*': '×', '/': '÷' };
  const MAX_DIGITS = 16;

  let current = '0';      // 目前輸入中的數字（字串）
  let previous = null;    // 前一個運算元（數字）
  let operator = null;    // 待執行的運算子
  let resetNext = false;  // 下一次輸入數字時是否要取代目前顯示
  let error = false;

  // 修正浮點數誤差，例如 0.1 + 0.2
  const normalize = (n) => parseFloat(n.toPrecision(12));

  function compute(a, b, op) {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return b === 0 ? NaN : a / b;
      default: return b;
    }
  }

  function format(str) {
    if (error) return '錯誤';
    const [intPart, decPart] = str.split('.');
    const sign = intPart.startsWith('-') ? '-' : '';
    const digits = intPart.replace('-', '');
    const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return sign + grouped + (decPart !== undefined ? '.' + decPart : '');
  }

  function toDisplayString(n) {
    if (!Number.isFinite(n)) return null;
    const normalized = normalize(n);
    const abs = Math.abs(normalized);
    if (abs !== 0 && (abs >= 1e16 || abs < 1e-10)) return normalized.toExponential(8);
    return String(normalized);
  }

  function render() {
    resultEl.textContent = current.includes('e') ? current : format(current);
    expressionEl.textContent = previous !== null && operator
      ? `${format(String(previous))} ${SYMBOLS[operator]}`
      : '';
    keys.querySelectorAll('.op').forEach((btn) => {
      btn.classList.toggle('active', resetNext && btn.dataset.op === operator);
    });
  }

  function setError() {
    error = true;
    current = '0';
    previous = null;
    operator = null;
    resetNext = true;
  }

  function inputDigit(d) {
    if (error) clearAll();
    if (resetNext) {
      current = d;
      resetNext = false;
      return;
    }
    if (current.replace(/[-.]/g, '').length >= MAX_DIGITS) return;
    current = current === '0' ? d : current === '-0' ? '-' + d : current + d;
  }

  function inputDecimal() {
    if (error) clearAll();
    if (resetNext) {
      current = '0.';
      resetNext = false;
      return;
    }
    if (!current.includes('.')) current += '.';
  }

  function chooseOperator(op) {
    if (error) return;
    if (operator && !resetNext) {
      const value = toDisplayString(compute(previous, parseFloat(current), operator));
      if (value === null) return setError();
      current = value;
    }
    previous = parseFloat(current);
    operator = op;
    resetNext = true;
  }

  function equals() {
    if (error || operator === null) return;
    const value = toDisplayString(compute(previous, parseFloat(current), operator));
    if (value === null) return setError();
    current = value;
    previous = null;
    operator = null;
    resetNext = true;
  }

  function clearAll() {
    current = '0';
    previous = null;
    operator = null;
    resetNext = false;
    error = false;
  }

  function backspace() {
    if (error) return clearAll();
    if (resetNext) return;
    current = current.length > 1 && current !== '-0' ? current.slice(0, -1) : '0';
    if (current === '-') current = '0';
  }

  function negate() {
    if (error) return;
    if (current.startsWith('-')) current = current.slice(1);
    else current = '-' + current;
    resetNext = false;
  }

  function percent() {
    if (error) return;
    const value = toDisplayString(parseFloat(current) / 100);
    if (value === null) return setError();
    current = value;
  }

  function handle(action, value) {
    switch (action) {
      case 'digit': inputDigit(value); break;
      case 'decimal': inputDecimal(); break;
      case 'op': chooseOperator(value); break;
      case 'equals': equals(); break;
      case 'clear': clearAll(); break;
      case 'backspace': backspace(); break;
      case 'negate': negate(); break;
      case 'percent': percent(); break;
    }
    render();
  }

  keys.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.digit) handle('digit', btn.dataset.digit);
    else if (btn.dataset.op) handle('op', btn.dataset.op);
    else handle(btn.dataset.action);
  });

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (/^\d$/.test(k)) handle('digit', k);
    else if (k === '.' || k === ',') handle('decimal');
    else if (k in SYMBOLS) handle('op', k);
    else if (k === 'Enter' || k === '=') handle('equals');
    else if (k === 'Backspace') handle('backspace');
    else if (k === 'Escape' || k === 'Delete') handle('clear');
    else if (k === '%') handle('percent');
    else return;
    e.preventDefault();
  });

  render();
})();
