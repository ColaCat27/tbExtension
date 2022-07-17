window.onload = () => {
  (async () => {
    //Отримуємо дані які зараз в storage
    let mrg = await getData("minimalRating");
    let isChecked = await getData("whitelistChecked");
    let whitelist = await getData("whitelist");
    let data;
    //--------------------------

    //Обсервер який слідкує за змінами на сторінці
    var previousUrl = "";

    var observer = new MutationObserver(async function (mutations) {
      if (location.href !== previousUrl) {
        previousUrl = location.href;
        // console.log("getConfig on");
        // console.log(location.href);
        fetchData(location.href);
        // getConfig();
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
        changeVisibility(data, whitelist);
      }
    });
    //--------------------------

    //слухаємо дані які повинні дійти зі сторінки
    window.addEventListener("message", async (event) => {
      if (event.data.type == "FROM_PAGE") {
        data = event.data.formatted;
        // console.log(`Get data`);
        console.log(data);
        chrome.storage.local.set({ data });
        changeVisibility(data, whitelist);
      }
    });
    //--------------------------

    //знаходимо об'єкт g_page_config у скриптах на сторінці, парсимо його в об'єкт та передаємо в іншу функцію

    // function getConfig() {
    //   const scripts = document.querySelectorAll("script");

    //   scripts.forEach((item) => {
    //     if (/g_page_config/.test(item.textContent)) {
    //       const g_page_config = item.textContent
    //         .replace("g_page_config = ", "")
    //         .trim()
    //         .split("}};");

    //       const f = JSON.parse(g_page_config[0] + "}}");

    //       var data = {
    //         type: "FROM_PAGE",
    //         formatted: f.mods.itemlist.data.auctions,
    //       };
    //       window.postMessage(data, "*");
    //     }
    //   });
    // }

    //--------------------------

    //Функція яка ховає та показує елементи
    function changeVisibility(data, whitelist) {
      const auctionsItem = document.querySelectorAll(
        '[data-category="auctions"]'
      );

      const wl = whitelist.split("\n");

      auctionsItem.forEach((auction) => {
        auction.style.display = "block";
      });

      auctionsItem.forEach((auction) => {
        const nid = auction
          .querySelector("a[trace-nid]")
          .getAttribute("trace-nid");

        const auctionIndex = data.findIndex((obj) => obj.nid == nid);

        if (auctionIndex == -1) {
          console.log(`Такого елементу немає у массиві`);
          return;
        }

        const target = data[auctionIndex];

        const result = filter(
          target,
          mrg,
          ["delivery", "description", "service"],
          wl
        );

        if (!result) {
          // console.log("Додав display: none для елемента");
          auction.style.display = "none";
        }
      });
    }
    //--------------------------

    //Функція на основі якої приймається рішення чи ховати елемент
    function filter(target, mrg, keys, list) {
      let success = 0;
      let isExist = false;

      //Перевіряємо чи whitelist використовується
      if (isChecked) {
        list.forEach((item) => {
          if (target["user_id"] == item) {
            isExist = true;
          }
        });

        if (!isExist) {
          return false;
        }
      }

      keys.forEach((item) => {
        if (target.shopcard[item] && target.shopcard[item][0] > mrg) {
          success += 1;
        }
      });

      if (success === 3) {
        return true;
      } else {
        return false;
      }
    }
    //--------------------------
  })();

  // Функція яка забирає json з потрібними даними
  function fetchData(url) {
    fetch(url)
      .then((response) => response.body)
      .then((rb) => {
        const reader = rb.getReader();

        return new ReadableStream({
          start(controller) {
            // The following function handles each data chunk
            function push() {
              // "done" is a Boolean and value a "Uint8Array"
              reader.read().then(({ done, value }) => {
                // If there is no more data to read
                if (done) {
                  // console.log("done", done);
                  controller.close();
                  return;
                }
                // Get the data and send it to the browser via the controller
                controller.enqueue(value);
                // Check chunks by logging to the console
                // console.log(done, value);
                push();
              });
            }

            push();
          },
        });
      })
      .then((stream) => {
        // Respond with our stream
        return new Response(stream, {
          headers: { "Content-Type": "text/html" },
        }).text();
      })
      .then((result) => {
        // Do things with result
        let json = result
          .match(/(?<=g_page_config\ =).*}};/)[0]
          .trim()
          .replace("}};", "}}");
        var data = {
          type: "FROM_PAGE",
          formatted: JSON.parse(json).mods.itemlist.data.auctions,
        };
        window.postMessage(data, "*");
      });
  }

  //--------------------------

  //Функція яка отримує дані зі storage
  function getData(sKey) {
    return new Promise(function (resolve, reject) {
      chrome.storage.local.get(sKey, function (items) {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
          reject(chrome.runtime.lastError.message);
        } else {
          resolve(items[sKey]);
        }
      });
    });
  }
  //--------------------------
};
