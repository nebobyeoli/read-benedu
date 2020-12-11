# read-benedu

Content reader via puppeteer

`hear, hear`

[~~`공부해`~~](https://benedu.co.kr/StudentHome)

<br>

> `do To-dos or`

- [x] 진행현황 출력
- [x] 시작 날짜 선택
- [ ] 끝 날짜 선택
- [ ] 사용자 > 날짜 선택
- [x] 문제 제외
- [ ] 사용자 > 문제 제외
- [ ] 사용자 > 계정 선택 직접 로그인?

<br>

> `sth-Helpful note-to-self`

```javascript
/* const pptr = require('puppeteer');       <...>
 * const [page] = await browser.pages();    <...>
 * console.log('connected');                <...>   */

const selector       = 'div.main-content ul > li:nth-child(2)';
const selector_multi = 'div.main-content ul > li';

// page.evaluate (A): runs typeof-string param command
const value = await page.evaluate(`document.querySelector('${selector}').getAttribute('value')`);

// page.$ : runs querySelectorAll()
const el    = await page.$(selector);
// page.$$: runs querySelectorAll()
const elArr = await page.$$(selector_multi);

// page.evaluate (B): runs function parameter command
const value = await page.evaluate(el => el.getAttribute('value'), elArr);

// page.$eval: runs $ w func param
const inner = await page.$eval(selector, el => el.innerHTML);

// page.$$eval: runs $$ w func param
// | concentrated example
// V
const attr = await page.$$eval(selector_multi, list => list.map(el => el.getAttribute('value')));
// el = querySelectorAll()
// x = each querySelector > map
```
