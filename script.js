import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyADEJbI42ZAiKSs_axKkeyLGHnducPyU7s",
    authDomain: "blog-7cf87.firebaseapp.com",
    projectId: "blog-7cf87",
    storageBucket: "blog-7cf87.firebasestorage.app",
    messagingSenderId: "851710728062",
    appId: "1:851710728062:web:3102c6bd85f271aa35c52f",
    measurementId: "G-WFDYD8SQHL"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const analytics = getAnalytics(app);

let data, allPosts = [];
let categories;

function stripHtml(html)
{
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
}

async function readTextFile(path)
{
    try
    {
        const response = await fetch(`./posts/${path}`);
        return response.ok ? await response.text() : null;
    }
    catch
    {
        return null;
    }
}

function resetView(showList = true)
{
    document.querySelector(".postContainer").style.display = showList ? "block" : "none";
    document.querySelector(".article")?.remove();
    document.querySelector(".others")?.remove();
}

async function syncViewWithServer(idx, postObj)
{
    const postRef = doc(db, "hits", String(idx));
    try
    {
        const snap = await getDoc(postRef);
        if (snap.exists()) postObj.view = snap.data().count;
        else
        {
            await setDoc(postRef, { count: 0 });
            postObj.view = 0;
        }
    }
    catch (e)
    {
        console.error("Firebase Sync Error:", e);
    }
}

async function increaseView(idx)
{
    const postRef = doc(db, "hits", String(idx));
    try
    {
        await updateDoc(postRef, { count: increment(1) });
    }
    catch (e)
    {
        console.error("View Count Update Error:", e);
    }
}

async function getPost()
{
    let idx = 0;
    while (true)
    {
        const origin = await readTextFile(`${idx}.txt`);
        if (!origin) break;

        const categoryRegex = origin.match(/\{(.*?)\}/);
        const titleRegex = origin.match(/\[(.*?)\]/);
        const dateRegex = origin.match(/<(.*?)>/);

        if (categoryRegex && titleRegex && dateRegex)
        {
            const postObj = {
                idx: idx,
                category: categoryRegex[1].trim(),
                title: titleRegex[1].trim(),
                date: dateRegex[1].trim(),
                content: origin.replace(/\{.*?\}/, "").replace(/\[.*?\]/, "").replace(/<.*?>/, "").trim(),
                view: 0
            };

            await syncViewWithServer(idx, postObj);
            allPosts.push(postObj);
        }
        idx++;
    }
}

function addCards(postsToShow, displayTitle = "모든 게시물")
{
    const postContainer = document.querySelector(".posts");
    const totalLabel = document.querySelector(".total");
    
    postContainer.innerHTML = "";
    totalLabel.textContent = `${displayTitle} (${postsToShow.length})`;

    postsToShow.forEach(post => 
    {
        const plainText = stripHtml(post.content);
        const postDom = `
            <div class="post" data-idx="${post.idx}">
                <div class="info">
                    <span>${post.category}</span>
                    <span>${post.date}</span>
                    <span>조회 : ${post.view}회</span>
                </div>
                <h1>${post.title}</h1>
                <p>${plainText.substring(0, 180)}${plainText.length > 180 ? '...' : ''}</p>
            </div>
        `;
        postContainer.insertAdjacentHTML("beforeend", postDom);
    });
}

function addArticle(idx)
{
    const post = allPosts.find(p => String(p.idx) === String(idx));
    if (!post) return;

    const parser = new DOMParser();
    const tempDoc = parser.parseFromString(post.content, 'text/html');

    tempDoc.querySelectorAll('code').forEach(codeBlock => 
    {
        codeBlock.textContent = codeBlock.textContent.trim();
    });

    const processedContent = tempDoc.body.innerHTML;

    const dom = `
        <div class="article">
            <div>
                <div class="info">
                    <span>${post.category}</span>
                    <span>${post.date}</span>
                    <span>조회 : ${post.view}회</span>
                </div>
                <h1>${post.title}</h1>
            </div>
            <div class="articleContent">${processedContent}</div>
        </div>
        <div class="others">
            <h1>같은 카테고리의 다른 글</h1>
            <ul></ul>
        </div>
    `;
    document.querySelector("main").insertAdjacentHTML("beforeend", dom);
    addSmallArticle(post.category, "article", idx);
}

function addSmallArticle(categoryName, to, except)
{
    let source = (categoryName === "all") ? [...allPosts] : allPosts.filter(p => p.category === categoryName);

    if (except !== "none") source = source.filter(item => String(item.idx) !== String(except));

    source.sort((a, b) => b.view - a.view);

    const selector = (to === "popular" ? ".popular ul" : ".others ul");
    const container = document.querySelector(selector);
    if (!container) return;

    container.innerHTML = "";
    const limit = Math.min(source.length, 4);

    for (let i = 0; i < limit; i++) container.insertAdjacentHTML("beforeend", `<li class="link">${source[i].title}</li>`);

    if (container.innerHTML == "") container.insertAdjacentHTML("beforeend", `게시물이 없습니다.`);
}

async function init()
{
    await getPost();

    try
    {
        const response = await fetch("./data.json");
        data = await response.json();
        categories = data.flatMap(item => item[1].flatMap(subItem => subItem.category));
    }
    catch (e)
    {
        console.error("Data load failed", e);
    }

    addCards(allPosts);
    addSmallArticle("all", "popular", "none");

    document.querySelectorAll(".root").forEach(rootUl => 
    {
        if (!data) return;
        data.forEach(([mainTitle, subTitles]) => 
        {
            rootUl.insertAdjacentHTML("beforeend", `<ul class="parent"><span class="menuTitle">${mainTitle}</span></ul>`);
            const parentElement = rootUl.lastElementChild;
            subTitles.forEach(sub => 
            {
                parentElement.insertAdjacentHTML("beforeend", `<ul class="child"><span class="sub-title">${sub.name}</span></ul>`);
                const childElement = parentElement.lastElementChild;
                sub.category.forEach(catItem => childElement.insertAdjacentHTML("beforeend", `<li>${catItem}</li>`));
            });
        });
    });

    document.addEventListener("click", async (e) => 
    {
        const target = e.target;

        if (target.classList.contains("showAllPosts"))
        {
            resetView(true);
            addCards(allPosts);
        }

        if (target.tagName === "LI")
        {
            if (target.classList.contains("link"))
            {
                const post = allPosts.find(p => p.title === target.textContent);
                if (post)
                {
                    await increaseView(post.idx);
                    post.view++;
                    resetView(false);
                    addArticle(post.idx);
                }
            }
            else
            {
                const cat = target.textContent.trim();
                resetView(true);
                addCards(allPosts.filter(p => p.category === cat), cat);
            }
        }

        if (target.classList.contains("menuTitle") || target.classList.contains("sub-title"))
        {
            const isMain = target.classList.contains("menuTitle");
            const children = target.parentElement.querySelectorAll(isMain ? ":scope > .child" : ":scope > li");
            children.forEach(item => item.classList.toggle("show"));
        }
        
        const postCard = target.closest(".post");
        if (postCard)
        {
            const idx = postCard.dataset.idx;
            const post = allPosts.find(p => String(p.idx) === String(idx));
            await increaseView(idx);
            post.view++;
            resetView(false);
            addArticle(idx);
        }
    });
}

init();