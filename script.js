let data, allPosts = [];

let categories;

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
            const category = categoryRegex[1].trim();
            const title = titleRegex[1].trim();
            const date = dateRegex[1].trim();
            
            const content = origin
                .replace(/\{.*?\}/, "")
                .replace(/\[.*?\]/, "")
                .replace(/<.*?>/, "")
                .trim();

            allPosts.push({ idx, category, title, content, date, view: 0 });
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

    postsToShow.forEach(post => {
        const postDom = `
            <div class="post" data-idx="${post.idx}">
                <div class="info">
                    <span>${post.category}</span>
                    <span>${post.date}</span>
                    <span>조회 : ${post.view}회</span>
                </div>
                <h1>${post.title}</h1>
                <p>${post.content.substring(0, 180)}${post.content.length > 180 ? '...' : ''}</p>
            </div>
        `;
        postContainer.insertAdjacentHTML("beforeend", postDom);
    });
}

function addArticle(idx)
{
    const post = allPosts.find(p => String(p.idx) === String(idx));
    if (!post) return;

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
            <p style="white-space: pre-wrap;">${post.content}</p>
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
    let source;

    if (categoryName === "all")
        source = [...allPosts];
        
    else
        source = allPosts.filter(p => p.category === categoryName);

    if (except !== "none")
    {
        source = source.filter(item => String(item.idx) !== String(except));
    }

    source.sort((a, b) => b.view - a.view);

    const selector = (to === "popular" ? ".popular ul" : ".others ul");
    const container = document.querySelector(selector);
    if (!container) return;

    container.innerHTML = "";
    const limit = Math.min(source.length, 4);

    for (let i = 0; i < limit; i++)
    {
        container.insertAdjacentHTML("beforeend", `<li class="link">${source[i].title}</li>`);
    }

    if (container.innerHTML == "")
        container.insertAdjacentHTML("beforeend", `게시물이 없습니다.`);
}

async function init()
{
    await getPost();

    try
    {
        const response = await fetch("./data.json");
        data = await response.json();
    }
    catch (e)
    {
        console.error("Data load failed", e);
    }

    categories = data.flatMap(item => 
        item[1].flatMap(subItem => subItem.category)
    );

    addCards(allPosts);

    document.querySelectorAll(".root").forEach(rootUl => {
        if (!data) return;
        data.forEach(([mainTitle, subTitles]) => {
            rootUl.insertAdjacentHTML("beforeend", `
                <ul class="parent">
                    <span class="menuTitle">${mainTitle}</span>
                </ul>
            `);
            const parentElement = rootUl.lastElementChild;

            subTitles.forEach(sub => {
                parentElement.insertAdjacentHTML("beforeend", `
                    <ul class="child">
                        <span class="sub-title">${sub.name}</span>
                    </ul>
                `);
                const childElement = parentElement.lastElementChild;
                sub.category.forEach(catItem => {
                    childElement.insertAdjacentHTML("beforeend", `<li>${catItem}</li>`);
                });
            });
        });
    });

    document.addEventListener("click", (e) => {
        if (e.target.classList.contains("showAllPosts"))
        {
            document.querySelector(".postContainer").style.display = "block";
            document.querySelector(".article")?.remove();
            document.querySelector(".others")?.remove();
            addCards(allPosts);
        }

        if (e.target.tagName === "LI")
        {
            if(e.target.classList.contains("link"))
            {
                document.querySelector(".postContainer").style.display = "none";
                document.querySelector(".article")?.remove();
                document.querySelector(".others")?.remove();
                
                addArticle(allPosts.find(p => p.title === e.target.textContent).idx);
                
            }
            else
            {
                const targetCategory = e.target.textContent.trim();
                const filtered = allPosts.filter(p => p.category === targetCategory);

                document.querySelector(".postContainer").style.display = "block";
                document.querySelector(".article")?.remove();
                document.querySelector(".others")?.remove();

                console.log(filtered, targetCategory);
                addCards(filtered, targetCategory);
            }
        }

        if (e.target.classList.contains("menuTitle") || e.target.classList.contains("sub-title"))
        {
            const isMain = e.target.classList.contains("menuTitle");
            const children = e.target.parentElement.querySelectorAll(isMain ? ":scope > .child" : ":scope > li");
            children.forEach(item => item.classList.toggle("show"));
        }
        
        const postCard = e.target.closest(".post");
        if (postCard)
        {
            const idx = postCard.dataset.idx;
            const post = allPosts.find(p => String(p.idx) === String(idx));
            
            document.querySelector(".postContainer").style.display = "none";
            document.querySelector(".article")?.remove();
            document.querySelector(".others")?.remove();

            addArticle(idx);
        }
    });

    addSmallArticle("all", "popular", "none");
}

init();