const dishes = [
    {
        name: "Паста Болоньезе",
        time: "35 мин",
        portions: 2,
        price: 720,
        image: "images/test.png"
    },
    {
        name: "Цезарь с курицей",
        time: "25 мин",
        portions: 2,
        price: 650,
        image: "images/test.png"
    },
    {
        name: "Том Ям",
        time: "40 мин",
        portions: 3,
        price: 890,
        image: "images/test.png"
    },
    {
        name: "Борщ",
        time: "60 мин",
        portions: 4,
        price: 780,
        image: "images/test.png"
    },
    {
        name: "Домашняя шаурма",
        time: "30 мин",
        portions: 2,
        price: 590,
        image: "images/test.png"
    },
    {
        name: "Карбонара",
        time: "25 мин",
        portions: 2,
        price: 690,
        image: "images/test.png"
    },
    {
        name: "Поке с лососем",
        time: "20 мин",
        portions: 1,
        price: 850,
        image: "images/test.png"
    },
    {
        name: "Курица терияки",
        time: "35 мин",
        portions: 2,
        price: 740,
        image: "images/test.png"
    },
    {
        name: "Сырники",
        time: "20 мин",
        portions: 2,
        price: 420,
        image: "images/test.png"
    },
    {
        name: "Лазанья",
        time: "55 мин",
        portions: 4,
        price: 990,
        image: "images/test.png"
    }
]

const catalog = document.getElementById("catalog")

dishes.forEach((dish) => {

    const card = document.createElement("article")

    card.classList.add("recipe_card")

    card.innerHTML = `
        <div class="recipe_image">

            <img
                src="${dish.image}"
                alt="${dish.name}"
                class="recipe_photo"
            >

            <button type="button" class="favorite_button">
                <img
                    src="images/star.png"
                    alt="Добавить в избранное"
                    class="favorite_star"
                >
            </button>

        </div>

        <div class="recipe_info">

            <h2 class="recipe_name">
                ${dish.name}
            </h2>

            <div class="recipe_meta">
                <span class="recipe_time">
                    ${dish.time} ·
                </span>

                <span class="recipe_portions">
                    ${dish.portions} порции
                </span>
            </div>

            <div class="recipe_price_row">
                <h2 class="recipe_price">
                    ≈ ${dish.price} ₽
                </h2>

                <button type="button" class="recipe_button">
                    Рецепт
                </button>
            </div>

            <button type="button" class="add_cart_button">
                В корзину
            </button>

        </div>
    `

    catalog.appendChild(card)
})