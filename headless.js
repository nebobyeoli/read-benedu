const fs = require('fs');
const puppeteer = require('puppeteer');
require('dotenv').config();

function rmChromeData(maxRetries, retryDelay, timeout, exitonCompletion) {
    console.log('removing chromeData temp folder...');

    fs.rmdir('chromeData', {
        recursive: true,
        maxRetries: maxRetries,
        retryDelay: retryDelay

    }, err => {
        if (err) console.error(err);
        else     console.log('removed chromeData temp folder');
        if (exitonCompletion) process.exit();
    });

    setTimeout(() => { console.log('remove failed'); process.exit(); }, timeout);
}

function aSleep(milliseconds) {
    return new Promise(res => setTimeout(res, milliseconds)); // res = resolve
}

function wait(command, timeout) {
    return Promise.all([ command, aSleep(timeout) ]);
}

async function rmValue(page, selector) {
    await page.click(selector);
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Delete');
}

async function screenshot(page, imgname='benedu') {
    console.log('screenshot...');
    await page.screenshot({ path: `./${imgname}.png`, fullPage: false});
    console.log('screenshot');
}

const query = { // Object for fetching selector values

    loginDiv: 'div form div.login-buttons',

    loginEmail: '#loginID',
    loginPd: '#loginPW',
    loginBtn: 'div form div.login-buttons > button:nth-child(1)',

    subj: '#Subject-select',
    subjEng: 'eAw5Wkv6E92IkZ3O2gUo3w{e}{e}',
    prevSwitch: 'div.main-content div.page-content div.form-group > div:nth-child(2) li > div:nth-child(1) > label',
    td10th: '#TaskList-table > tbody > tr:nth-child(10)',
    chrowMax: '#TaskList-table_length > label > select',

    problemtr: '#TaskList-table > tbody > tr',
};

// npm run head

exports.run = async function () {

    const browser = await puppeteer.launch({
        ignoreDefaultArgs: true,
        headless: true,
        devtools: false,
        defaultViewport: { width: 1280, height: 882 },
        args: [
            '--incognito',
            '--headless',
            '--no-sandbox',
            '--disable-gpu',
            '--user-data-dir=./chromeData/temp',
            'https://benedu.co.kr/',
            '--mute-audio',
            '--no-first-run',
            '--disable-gl-drawing-for-tests',
            '--disable-dev-shm-usage',
            '--disable-extensions',
            '--no-zygote'
        ]
    });

    // const browser = await puppeteer.launch({ headless: false, args: ['https://benedu.co.kr/'] });

    const [page] = await browser.pages();
    console.log('connected');

    try
    {
        await enableStealth(page);
        console.log('enabled stealth');

        await page.waitForSelector(query.loginDiv);

        if (await page.$eval(query.loginEmail, el => el.value)) await rmValue(page, query.loginEmail);
        await wait(page.type(query.loginEmail, process.env.mymail), 300);
        await wait(page.type(query.loginPd,    process.env.mypd),   300);
        await page.click(query.loginBtn);

        // From https://stackoverflow.com/a/58451235
        // -- NO [await] keyword
        // page.waitForRequest(req => req.url().includes('StudentHome') && req.method() == 'GET');

        for (; !page.url().includes('StudentHome'); await aSleep(400));
        console.log('logged in');

        await wait(page.goto('https://benedu.co.kr/StudentStudy/TaskList', { waitUntil: 'domcontentloaded' }), 600),
        console.log('goto /StudentStudy/TaskList');

        // 시험 과목 -> '영어'
        await wait(page.select(query.subj, query.subjEng), 600);

        // 지난 학습 보기
        await wait(page.click(query.prevSwitch), 1000);
        for (; await page.$(query.td10th) == null; await aSleep(400)); // 목록 load 대기

        // 항목 표시 -> '100'
        await wait(page.select(query.chrowMax, '100'), 600);
        console.log('switched subj prev');

        const probList = await page.$$(query.problemtr);
        console.log('stored days:', probList.length);

        // 주소 id 목록 (tr) 저장 -- 일별 2문제마다
        const values = [];

        // From https://stackoverflow.com/a/56467778
        for (const tr of probList) {
            const value = await page.evaluate(el => el.getAttribute('value'), tr);
            values.push(value);
        }
        console.log('pushed problem link ids');

        const questions = [];
        const answers   = [];
        const explains  = [];

        let i = 1;
        let question = '';

        const n = [ null, '①', '②', '③', '④', '⑤' ];

        values.pop(); // 처음 두 문제는 제외

        for (const value of values.reverse()) {

            const link = `https://benedu.co.kr/StudentStudy/Commentary?id=${value.slice(0,-6)}%7Be%7D%7Be%7D&value=ymWuGYYSOfmJLRPkt3xlfw%7Be%7D%7Be%7D&type=0`;
            await page.goto(link, { waitUntil: 'domcontentloaded' });

            for (let j = 1; j <= 2; console.log(i, 'ok'), questions.push(question), j++, i++) { // 문제 1, 2

                question = `${i}. `;

                let childCount = await page.$eval(`#QUESTION_${j} > div:nth-child(2)`, el => el.childElementCount);

                let need2ndTable = false;

                for (let k = 1; k <= childCount; k++) {

                    const obj = await page.$eval(`#QUESTION_${j} > div:nth-child(2) > :nth-child(${k})`, c => {
                        return { tagName: c.tagName, innerHTML: c.innerHTML, textContent: c.textContent };
                    }); // elem-child

                    if (obj.textContent == '') continue;
                    
                    if (need2ndTable) {
                        obj.tagName = 'TABLE';
                        obj.innerHTML = await page.$eval(`#TestBody > div > div > div:nth-child(${j==1 ? 1 : 3}) > table`, c => c.innerHTML);
                    }

                    obj.innerHTML = obj.innerHTML.replace(/\xa0/g, ' ')
                        .replace(/<span style="text-decoration:underline;">|<\/span>|<span class="WrongCheck">/g, '');

                    if (obj.tagName == 'P') {
                        // 1번. 다음 빈칸에 들어갈 말로 가장 적절한 것은?
                        if (obj.innerHTML.includes('번</b>')) {
                            question += obj.innerHTML.split('&nbsp;')[1] + '\n';

                            if (!(await page.$eval(`#QUESTION_${j} > div:nth-child(2)`, c => c.innerHTML)).includes('<table')) {
                                need2ndTable = true;
                            }
                        }

                        // ① ② ③ ④ ⑤
                        else {
                            let l = obj.textContent;
                            if (l.slice(-1) == ' ' || l.slice(-1) == '\xa0') l = l.slice(0, -1);
                            question += l + '\n';

                            // 정답
                            if (obj.innerHTML.includes('AnswerCheck')) {
                                let ld = obj.textContent.slice(0, 1);
                                answers.push(n.indexOf(ld));
                            }
                        }
                    }

                    else if (obj.tagName == 'TABLE' || need2ndTable) {

                        // -- 기존 selector에 table 없으면 여기로
                        //1-- #TestBody > div > div > div:nth-child(1) > table
                        //2-- #TestBody > div > div > div:nth-child(3) > table

                        let l;
                        if (need2ndTable)   l = await page.$eval(`#TestBody > div > div > div:nth-child(${j==1 ? 1 : 3}) > table`, c => c.innerHTML);
                        else                l = obj.innerHTML;

                        while (l.slice(0, 6) == '&nbsp;') l = l.slice(6);

                        l = l.replace(/\n&nbsp;/g, '\n ').replace(/\n &nbsp;/g, '\n  ')
                             .replace(/<span class="AnswerCheck">/g, '')
                             .replace(/&nbsp;/g, '_'.repeat(3))
                             .replace(/<p><\/p>/g, '').split(/<p>|<\/p>/).slice(1, -1).join('\n')
                             .replace(/_  /g, '_ ').replace(/  _/g, ' _')
                             .replace(/_ \(A\)/g, '_(A)').replace(/_ \(B\)/g, '_(B)').replace(/_ \(C\)/g, '_(C)')
                             .replace(/<p style="text-align:center;"><span style="">/g, '\n' + ' '.repeat(10))
                             .replace(/ \*/g, '\n*')
                             .replace(/<span style="text-decoration:underline;">|<span style="font-style:italic;">|<\/span>/g, '')
                             .replace(/\n\(/g, '\n  (')
                             .replace(/\n______/g, '\n  ');

                        while (l.slice(0, 6) == '______') l = l.slice(6);
                        while (l.includes(' \n')) l = l.replace(/ \n/g, ' ');

                        question += '  ' + l + '\n\n';
                        need2ndTable = false;
                    }
                }

                question = question.replace(/\n\n① ①번\n② ②번\n③ ③번\n④ ④번\n⑤ ⑤번/g, '')
                    .replace(/① /g, '①').replace(/② /g, '②').replace(/③ /g, '③').replace(/④ /g, '④').replace(/⑤ /g, '⑤')
                    .replace(/①/g, '① ').replace(/②/g, '② ').replace(/③/g, '③ ').replace(/④/g, '④ ').replace(/⑤/g, '⑤ ');
            }
        }

        console.log('writing...');

        let joinAnswers = '';
        for (let j = 0; j < answers.length; j += 10) {
            joinAnswers += answers.slice(j, j + 10).join(' ') + '\n';
        }
        fs.writeFileSync('./questions.txt', `${joinAnswers}\n\n\n\n${questions.join('\n\n\n\n')}`, { encoding: 'utf-8' });
        console.log('writing done');

        // 베네듀는 자동로그아웃됨

        // finish
        await browser.close();
        console.log('closed browser');
        rmChromeData(5, 800, 15000, true);
    }
    
    catch (err) {
        console.error(err);
        await screenshot(page, 'errshot');
        await browser.close();
        rmChromeData(5, 800, 15000, true);
    }
}

exports.run();

async function enableStealth(page) {
// From https://intoli.com/blog/not-possible-to-block-chrome-headless/
// In   https://stackoverflow.com/questions/50663992/puppeteer-queryselector-returns-null/50710920

    // Pass the User-Agent Test.
    // const userAgent = 'Mozilla/5.0 (X11; Linux x86_64)' + 'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.39 Safari/537.36';
    const userAgent = 'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0';
    await page.setUserAgent(userAgent);

    // Pass the Webdriver Test.
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    // Pass the Chrome Test.
    await page.evaluateOnNewDocument(() => {
        window.navigator.chrome = { runtime: {} };
    });

    // Pass the Permissions Test.
    await page.evaluateOnNewDocument(() => {
        const originalQuery = window.navigator.permissions.query;
        return window.navigator.permissions.query = (parameters) => {
            parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters);
        };
    });

    // Pass the Plugins Length Test.
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    });

    // Pass the Languages Test.
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });
}
