window.onload = () => {
  (async () => {
    //
    let css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = chrome.runtime.getURL("assets/sprite/sprite.css");
    document.querySelector("head").append(css);
    //--------------------------

    //Отримуємо дані які зараз в storage
    let mrg = parseInt(await getStorageData("minimalRating"));
    let isChecked = await getStorageData("whitelistChecked");
    let whitelist = await getStorageData("whitelist");
    let data;
    //--------------------------

    //Обсервер який слідкує за змінами на сторінці
    var previousUrl = "";

    var observer = new MutationObserver(async function (mutations) {
      if (location.href !== previousUrl) {
        previousUrl = location.href;

        //Робимо запит для оновлення даних
        fetchData(location.href);
      }
    });

    const config = { subtree: true, childList: true };
    observer.observe(document, config);
    //--------------------------

    //чекаємо оновлення данних які знаходяться в storage
    chrome.storage.onChanged.addListener(async function (changes, namespace) {
      if (changes) {
        if (changes.minimalRating) {
          mrg = parseInt(changes.minimalRating.newValue);
        }
        if (changes.whitelist) {
          whitelist = changes.whitelist.newValue;
        }
        if (changes.whitelistChecked) {
          isChecked = changes.whitelistChecked.newValue;
        }
        if (isNaN(mrg)) {
          mrg = 0;
        }
        //викликаємо функцію яка змінить відображення елементів на основі нових даних
        changeVisibility(data, whitelist);
      }
    });
    //--------------------------

    //слухаємо дані які повинні дійти зі сторінки
    window.addEventListener("message", async (event) => {
      if (event.data.type == "FROM_PAGE") {
        data = event.data.formatted;
        chrome.storage.local.set({ data });
        changeVisibility(data, whitelist);
      }
    });
    //--------------------------

    //Функція яка ховає та показує елементи
    function changeVisibility(data, whitelist) {
      let json = [];

      document
        .querySelectorAll('[data-category="auctions"]')
        .forEach((item) => {
          item.style.display = "block";
        }); // спочатку надаємо всім елементам display: block;

      data.forEach((item, i) => {
        try {
          let newJson = {};

          let formattedTitle = item.raw_title.match(/\w+/g);

          if (Array.isArray(formattedTitle)) {
            if (formattedTitle.length > 1) {
              formattedTitle = formattedTitle.join(" | ");
            } else if (formattedTitle.length == 1) {
              formattedTitle = formattedTitle[0];
            }
          } else {
            formattedTitle = `Keyword ${item.raw_title}`;
          }
          newJson.index = i + 1;
          newJson.itemID = item.nid;
          newJson.shopID = item.user_id;
          newJson.longTitle = item.raw_title;
          newJson.shortTitle = formattedTitle;
          newJson.volumeOfSales = item.view_sales;
          newJson.picUrl = item.pic_url;
          newJson.delivery = item.shopcard.delivery[0] || 0;
          newJson.description = item.shopcard.description[0] || 0;
          newJson.service = item.shopcard.service[0] || 0;
          newJson.filter = true;
          newJson.toSave = false;
          newJson.idNote = "";

          json.push(newJson);
        } catch (err) {
          console.log(err);
        }
      });

      json = json.map((item, i) => {
        if (
          item.delivery < mrg &&
          item.description < mrg &&
          item.service < mrg
        ) {
          item.filter = false;
          return item;
        } else {
          return item;
        }
      });

      if (isChecked) {
        let wl = whitelist.split("\n");

        json = json.map((item) => {
          if (item.filter) {
            if (!wl.includes(item.shopID)) {
              item.filter = false;
            }
          }
          return item;
        });
      }

      json.forEach((item) => {
        if (!item.filter) {
          const elem = document.querySelector(
            `div[data-index="${item.index - 1}"]`
          );
          if (elem) {
            elem.style.display = "none"; //ховаємо елемент
          }
        } else {
          const elem = document.querySelector(
            `div[data-index="${item.index - 1}"]`
          );
          if (elem) {
            const isExist = elem.querySelector(".sprite");
            if (!isExist) {
              let sprite = document.createElement("div");
              sprite.classList.add("sprite");
              sprite.classList.add("icon-plus");
              sprite.style.backgroundImage = `url(${chrome.runtime.getURL(
                "assets/sprite/sprite.png"
              )})`;
              elem.style.position = "relative";
              sprite.style.position = "absolute";
              sprite.style.bottom = "10px";
              sprite.style.right = "35px";
              elem.append(sprite);
              sprite.addEventListener("click", () => {
                if (sprite.classList.contains("icon-plus")) {
                  sprite.classList.remove("icon-plus");
                  sprite.classList.add("icon-minus");
                  elem.style.border = "2px solid green";
                } else {
                  sprite.classList.remove("icon-minus");
                  sprite.classList.add("icon-plus");
                  elem.style.border = "2px solid red";
                }
              });
            }
          }
        }
      });
    }
    //--------------------------
  })();
};
