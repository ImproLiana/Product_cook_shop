const catalog = document.getElementById("catalog")
const cartProducts = document.getElementById("cart_products")
const searchInput = document.getElementById("search_input")
let dishes = []
let cart = readStorage("buycook_cart")
let favorites = readStorage("buycook_favorites")
let userDishes = readStorage("buycook_dishes")
let favoritesOnly = new URLSearchParams(location.search).get("view") === "favorites"
let searchText = new URLSearchParams(location.search).get("q") || ""
const toast = makeElement("div", "toast")
toast.setAttribute("role", "status")
toast.setAttribute("aria-live", "polite")
document.body.append(toast)
let toastTimer
const recipeDialog = makeDialog("recipe_dialog", "recipe_title")
const productsDialog = makeDialog("products_dialog", "products_title")
const successDialog = makeDialog("success_dialog", "success_title")

function makeElement(tag, className = "", text = "") {
    const element = document.createElement(tag)
    if (className) element.className = className
    if (text !== "") element.textContent = text
    return element
}

function makeButton(text, className, action) {
    const button = makeElement("button", className, text)
    button.type = "button"
    button.addEventListener("click", action)
    return button
}

function readStorage(key) {
    try {
        const value = JSON.parse(localStorage.getItem(key) || "[]")
        return Array.isArray(value) ? value : []
    } catch {
        return []
    }
}
function saveStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value))
        return true
    } catch {
        showToast("Не удалось сохранить данные. Проверьте свободное место и доступ к хранилищу.")
        return false
    }
}
function showToast(text) {
    clearTimeout(toastTimer)
    const container = document.querySelector("dialog[open]") || document.body
    container.append(toast)
    toast.textContent = text
    toast.classList.add("visible")
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 4000)
}
function money(value) {
    return value.toLocaleString("ru-RU", { maximumFractionDigits: 2 }) + " ₽"
}
function numberText(value) {
    return value.toLocaleString("ru-RU", { maximumFractionDigits: 3 })
}
function word(count, one, few, many) {
    if (count % 100 >= 11 && count % 100 <= 14) return many
    if (count % 10 === 1) return one
    if (count % 10 >= 2 && count % 10 <= 4) return few
    return many
}
function portionsText(count) {
    return count + " " + word(count, "порция", "порции", "порций")
}
function getDish(id) {
    return dishes.find(dish => String(dish.id) === String(id))
}
function getCartItem(id) {
    return cart.find(item => String(item.id) === String(id))
}
function parseAmount(amount) {
    const text = String(amount).replace(/,/g, ".").trim()
    if (text.includes("желток")) return { quantity: 3, unit: "шт.", note: amount }
    const match = text.match(/^(\d+(?:\.\d+)?)(?:\s*([/–-])\s*(\d+(?:\.\d+)?))?\s*(.*)$/)
    if (!match) return { quantity: 1, unit: "набор", note: amount }
    let quantity = Number(match[1])
    if (match[2] === "/") quantity /= Number(match[3])
    else if (match[2]) quantity = (quantity + Number(match[3])) / 2
    let unit = match[4] || "шт."
    if (unit.startsWith("зубч")) unit = "зубч."
    return { quantity, unit, note: match[2] && match[2] !== "/" ? amount : "" }
}

function normalizeDish(dish) {
    return {
        ...dish,
        portions: Number(dish.portions || dish.servings || 2),
        time: dish.time || dish.time_minutes || null,
        ingredients: dish.ingredients.map(ingredient => ({ ...ingredient, ...parseAmount(ingredient.amount) }))
    }
}
function makeCartItem(dish) {
    return {
        id: dish.id,
        portions: dish.portions,
        ingredients: dish.ingredients.map(ingredient => ({ quantity: ingredient.quantity / dish.portions, selected: true }))
    }
}
function ingredientPrice(item, index) {
    const ingredient = getDish(item.id).ingredients[index]
    const choice = item.ingredients[index]
    if (!choice.selected) return 0
    return Math.round(ingredient.estimated_cost_rub * choice.quantity * item.portions / ingredient.quantity * 100) / 100
}
function dishPrice(item) {
    return Math.round(item.ingredients.reduce((sum, ingredient, index) => sum + ingredientPrice(item, index), 0) * 100) / 100
}


function selectedCount(item) {
    return item.ingredients.filter(ingredient => ingredient.selected).length
}
function cartTotal() {
    return Math.round(cart.reduce((sum, item) => sum + dishPrice(item), 0) * 100) / 100
}
function saveCart() {
    const saved = saveStorage("buycook_cart", cart)
    updateCartButtons()
    updateSummary()
    return saved
}
function makeDialog(id, titleId) {
    const dialog = makeElement("dialog", "app_dialog")
    dialog.id = id
    dialog.setAttribute("aria-labelledby", titleId)
    document.body.append(dialog)
    setupDialog(dialog)
    return dialog
}
function setupDialog(dialog) {
    dialog.addEventListener("click", event => {
        const rect = dialog.getBoundingClientRect()
        if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close()
    })
    dialog.addEventListener("close", () => {
        document.body.classList.toggle("modal_open", Boolean(document.querySelector("dialog[open]")))
        const container = document.querySelector("dialog[open]") || document.body
        container.append(toast)
    })
}
function closeButton(dialog) {
    const button = makeButton("×", "close_dialog", () => dialog.close())
    button.setAttribute("aria-label", "Закрыть окно")
    return button
}

function openDialog(dialog) {
    document.querySelectorAll("dialog[open]").forEach(open => open.close())
    closeMenu()
    dialog.showModal()
    document.body.classList.add("modal_open")
}
function dishImage(dish, className) {
    const wrapper = makeElement("div", className + " image_wrapper")
    const image = makeElement("img")
    image.alt = dish.name
    image.loading = "lazy"
    image.addEventListener("error", () => {
        image.replaceWith(makeElement("span", "image_placeholder", "Фото скоро появится"))
    }, { once: true })
    image.src = dish.image
    wrapper.append(image)
    return wrapper
}
function makeCartButton(dish) {
    const button = makeButton("", "add_cart_button", () => {
        if (getCartItem(dish.id)) {
            openProducts(dish)
        } else {
            cart.push(makeCartItem(dish))
            const saved = saveCart()
            if (cartProducts) renderCart()
            if (saved) showToast("Блюдо добавлено в корзину")
        }
    })
    button.dataset.cartId = dish.id
    button.textContent = getCartItem(dish.id) ? "Изменить продукты" : "В корзину"
    return button
}
function updateCartButtons() {
    document.querySelectorAll("[data-cart-id]").forEach(button => {
        const added = Boolean(getCartItem(button.dataset.cartId))
        button.textContent = added ? "Изменить продукты" : "В корзину"
        button.classList.toggle("in_cart", added)
    })
    const badge = document.getElementById("cart_badge")
    badge.textContent = cart.length
    badge.hidden = cart.length === 0
}
function makeFavoriteButton(dish) {
    const button = makeButton("", "favorite_button", () => {
        const index = favorites.indexOf(dish.id)
        if (index === -1) favorites.push(dish.id)
        else favorites.splice(index, 1)
        const saved = saveStorage("buycook_favorites", favorites)
        updateFavoriteButtons()
        if (favoritesOnly && catalog) renderCatalog()
        if (saved) showToast(index === -1 ? "Блюдо добавлено в избранное" : "Блюдо удалено из избранного")
    })
    button.dataset.favoriteId = dish.id
    return button
}
function updateFavoriteButtons() {
    document.querySelectorAll("[data-favorite-id]").forEach(button => {
        const active = favorites.some(id => String(id) === button.dataset.favoriteId)
        button.textContent = active ? "★" : "☆"
        button.classList.toggle("is_favorite", active)
        button.setAttribute("aria-pressed", active)
        button.setAttribute("aria-label", active ? "Убрать из избранного" : "Добавить в избранное")
    })
}
function timeText(dish) {
    if (!dish.time) return "Время не указано"
    return (dish.time.min === dish.time.max ? dish.time.min : dish.time.min + "–" + dish.time.max) + " мин"
}
function emptyState(title, text, buttonText, action) {
    const block = makeElement("div", "empty_state")
    block.append(makeElement("h2", "", title), makeElement("p", "", text))
    if (buttonText) block.append(makeButton(buttonText, "primary_button", action))
    return block
}
function renderCatalog() {
    if (!catalog) return
    const heading = document.querySelector(".catalog > h1")
    heading.replaceChildren()
    if (favoritesOnly) heading.textContent = "Избранное"
    else heading.append("Выберите блюдо.", makeElement("br"), "Продукты соберём мы.")
    document.getElementById("sec_text_catalog").textContent = favoritesOnly ? "Любимые блюда всегда под рукой." : "Уберите то, что уже есть дома, и закажите остальное одним набором."
    const visibleDishes = findDishes(searchText).filter(dish => !favoritesOnly || favorites.includes(dish.id))
    catalog.replaceChildren()
    if (!visibleDishes.length) catalog.append(emptyState(searchText ? "Ничего не найдено" : "В избранном пока пусто", searchText ? "Попробуйте другое название или ингредиент." : "Нажмите на звёздочку у понравившегося блюда.", "Вернуться в каталог", () => setCatalogView(false)))
    visibleDishes.forEach(dish => {
        const card = makeElement("article", "recipe_card")
        card.dataset.dishId = dish.id
        card.tabIndex = 0
        card.setAttribute("aria-label", "Открыть рецепт: " + dish.name)
        card.addEventListener("click", event => {
            if (!event.target.closest("button")) openRecipe(dish)
        })
        card.addEventListener("keydown", event => {
            if (event.target === card && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault()
                openRecipe(dish)
            }
        })
        const image = dishImage(dish, "recipe_image")
        image.append(makeFavoriteButton(dish))
        const info = makeElement("div", "recipe_info")
        const priceRow = makeElement("div", "recipe_price_row")
        priceRow.append(makeElement("h2", "recipe_price", "≈ " + money(dishPrice(makeCartItem(dish)))), makeButton("Рецепт", "recipe_button", () => openRecipe(dish)))
        info.append(makeElement("h2", "recipe_name", dish.name), makeElement("div", "recipe_meta", timeText(dish) + " · " + portionsText(dish.portions)), priceRow, makeCartButton(dish))
        card.append(image, info)
        catalog.append(card)
    })
    document.getElementById("catalog_count").textContent = "Найдено блюд: " + visibleDishes.length
    document.getElementById("catalog_back").hidden = !favoritesOnly && !searchText
    updateFavoriteButtons()
    updateCartButtons()
}
function setCatalogView(favorite) {
    if (!catalog) {
        location.href = favorite ? "index.html?view=favorites" : "index.html"
        return
    }
    favoritesOnly = favorite
    searchText = ""
    searchInput.value = ""
    history.replaceState(null, "", favorite ? "index.html?view=favorites" : "index.html")
    closeMenu()
    renderCatalog()
    window.scrollTo({ top: 0 })
}
function openRecipe(dish) {
    recipeDialog.replaceChildren(closeButton(recipeDialog), dishImage(dish, "recipe_cover"))
    const body = makeElement("div", "dialog_body")
    const title = makeElement("h2", "dialog_title", dish.name)
    title.id = "recipe_title"
    const meta = makeElement("div", "dish_meta")
    meta.append(makeElement("span", "", timeText(dish)), makeElement("span", "", portionsText(dish.portions)), makeElement("span", "", "≈ " + money(dishPrice(makeCartItem(dish)))))
    const columns = makeElement("div", "recipe_columns")
    const cooking = makeElement("section", "cooking")
    const steps = makeElement("ol", "recipe_steps")
    dish.recipe.forEach(step => steps.append(makeElement("li", "", step.replace(/^\s*\d+[.)]\s*/, ""))))
    cooking.append(makeElement("h3", "section_label", "Приготовление"), steps)
    const ingredients = makeElement("section", "recipe_ingredients")
    const list = makeElement("ul", "recipe_ingredient_list")
    dish.ingredients.forEach(ingredient => {
        const row = makeElement("li")
        row.append(makeElement("span", "", ingredient.name), makeElement("span", "", ingredient.amount))
        list.append(row)
    })
    ingredients.append(makeElement("h3", "section_label", "Ингредиенты"), list)
    columns.append(cooking, ingredients)
    body.append(title, meta, columns)
    const footer = makeElement("div", "dialog_footer")
    footer.append(makeCartButton(dish))
    recipeDialog.append(body, footer)
    openDialog(recipeDialog)
}
function makePortions(item, onChange) {
    const box = makeElement("div", "cart_portions")
    const value = makeElement("span", "portion_number", item.portions)
    value.setAttribute("aria-live", "polite")
    const label = makeElement("span", "portions_text")
    const minus = makeButton("−", "minus_button", () => change(-1))
    const plus = makeButton("+", "plus_button", () => change(1))
    minus.setAttribute("aria-label", "Уменьшить количество порций")
    plus.setAttribute("aria-label", "Увеличить количество порций")
    function refresh() {
        value.textContent = item.portions
        label.textContent = word(item.portions, "порция", "порции", "порций")
        minus.disabled = item.portions <= 1
        plus.disabled = item.portions >= 20
    }
    function change(delta) {
        item.portions = Math.max(1, Math.min(20, item.portions + delta))
        refresh()
        onChange()
    }
    box.append(minus, value, plus, label)
    refresh()
    return box
}
function makeIngredientEditor(item, onChange) {
    const dish = getDish(item.id)
    const editor = makeElement("div", "ingredient_editor")
    const toolbar = makeElement("div", "ingredient_toolbar")
    const selectAll = makeButton("Выбрать все", "text_button", () => select(true))
    const removeAll = makeButton("Убрать все", "text_button", () => select(false))
    toolbar.append(selectAll, removeAll)
    editor.append(toolbar)
    const rows = []
    dish.ingredients.forEach((ingredient, index) => {
        const choice = item.ingredients[index]
        const row = makeElement("div", "ingredient_row")
        const label = makeElement("label", "ingredient_label")
        const checkbox = makeElement("input", "ingredient_checkbox")
        checkbox.type = "checkbox"
        const mark = makeElement("span", "checkbox_mark")
        mark.setAttribute("aria-hidden", "true")
        label.append(checkbox, mark, makeElement("span", "ingredient_name", ingredient.name))
        const amount = makeElement("div", "ingredient_amount")
        const input = makeElement("input", "quantity_input")
        input.type = "text"
        input.inputMode = "decimal"
        input.setAttribute("aria-label", "Количество: " + ingredient.name + ", " + ingredient.unit)
        input.autocomplete = "off"
        const price = makeElement("span", "ingredient_price")
        amount.append(input, makeElement("span", "ingredient_unit", ingredient.unit))
        row.append(label, amount, price)
        if (ingredient.note) row.append(makeElement("small", "ingredient_note", "На " + portionsText(dish.portions) + ": " + ingredient.note))
        checkbox.addEventListener("change", () => {
            choice.selected = checkbox.checked
            refresh(false)
            onChange()
        })
        input.addEventListener("input", () => {
            const text = input.value.trim().replace(",", ".")
            const value = Number(text)
            const valid = /^\d+(?:\.\d{1,3})?$/.test(text) && Number.isFinite(value) && value > 0
            input.setAttribute("aria-invalid", !valid)
            if (!valid) return
            choice.quantity = value / item.portions
            refresh(false)
            onChange()
        })
        input.addEventListener("blur", () => {
            if (input.getAttribute("aria-invalid") === "true") {
                input.value = numberText(choice.quantity * item.portions).replace(/\s/g, "")
                input.removeAttribute("aria-invalid")
                showToast("Введите количество больше нуля. Чтобы убрать продукт, снимите галочку.")
            }
        })
        rows.push({ row, checkbox, input, price })
        editor.append(row)
    })
    function refresh(updateInputs = true) {
        rows.forEach((elements, index) => {
            const choice = item.ingredients[index]
            elements.checkbox.checked = choice.selected
            elements.row.classList.toggle("excluded", !choice.selected)
            elements.price.textContent = money(ingredientPrice(item, index))
            if (updateInputs) {
                elements.input.value = numberText(choice.quantity * item.portions).replace(/\s/g, "")
                elements.input.removeAttribute("aria-invalid")
            }
        })
        selectAll.disabled = item.ingredients.every(ingredient => ingredient.selected)
        removeAll.disabled = item.ingredients.every(ingredient => !ingredient.selected)
    }
    function select(selected) {
        item.ingredients.forEach(ingredient => { ingredient.selected = selected })
        refresh()
        onChange()
    }
    refresh()
    return { element: editor, refresh }
}
function openProducts(dish) {
    const item = getCartItem(dish.id)
    productsDialog.replaceChildren(closeButton(productsDialog))
    const title = makeElement("h2", "dialog_title", "Продукты для блюда")
    title.id = "products_title"
    const total = makeElement("strong", "editor_total")
    const count = makeElement("p", "muted")
    const editor = makeIngredientEditor(item, update)
    const portions = makePortions(item, () => {
        editor.refresh()
        update()
    })
    const footer = makeElement("div", "editor_footer")
    footer.append(total, makeButton("Готово", "primary_button", () => productsDialog.close()))
    productsDialog.append(title, makeElement("p", "editor_dish_name", dish.name), portions, makeElement("p", "editor_hint", "Порции: от 1 до 20. Количество каждого продукта можно изменить отдельно. Снимите галочку, если он уже есть дома."), editor.element, count, footer)
    function update() {
        total.textContent = "Итого: " + money(dishPrice(item))
        count.textContent = "Выбрано продуктов: " + selectedCount(item) + " из " + item.ingredients.length
        saveCart()
        if (cartProducts) renderCart()
    }
    update()
    openDialog(productsDialog)
}

function renderCart() {
    if (!cartProducts) return
    const expanded = new Set(Array.from(cartProducts.querySelectorAll(".ingredients_button[aria-expanded='true']"), button => button.dataset.id))
    cartProducts.replaceChildren()
    if (!cart.length) cartProducts.append(emptyState("В корзине пока нет блюд", "Выберите блюдо в каталоге, а продукты мы соберём в один список.", "Перейти в каталог", () => { location.href = "index.html" }))
    cart.forEach(item => {
        const dish = getDish(item.id)
        const card = makeElement("article", "cart_card")
        card.dataset.dishId = item.id
        const info = makeElement("div", "cart_product_info")
        const name = makeButton(dish.name, "cart_product_name", () => openRecipe(dish))
        const count = makeElement("p", "cart_product_count")
        const price = makeElement("p", "cart_product_price")
        const panel = makeElement("div", "cart_ingredients")
        panel.id = "ingredients_" + item.id
        panel.hidden = !expanded.has(String(item.id))
        const toggle = makeButton("Ингредиенты", "ingredients_button", () => {
            panel.hidden = !panel.hidden
            toggle.setAttribute("aria-expanded", !panel.hidden)
        })
        toggle.dataset.id = item.id
        toggle.setAttribute("aria-expanded", !panel.hidden)
        toggle.setAttribute("aria-controls", panel.id)
        const arrow = makeElement("span", "ingredients_arrow")
        arrow.setAttribute("aria-hidden", "true")
        toggle.append(arrow)
        const editor = makeIngredientEditor(item, update)
        panel.append(editor.element)
        const portions = makePortions(item, () => {
            editor.refresh()
            update()
        })
        const remove = makeButton("×", "delete_product", () => {
            cart = cart.filter(product => product.id !== item.id)
            const saved = saveCart()
            renderCart()
            if (saved) showToast("Блюдо удалено из корзины")
        })
        remove.setAttribute("aria-label", "Удалить из корзины: " + dish.name)
        info.append(name, count, toggle)
        card.append(dishImage(dish, "cart_product_image"), info, portions, price, remove, panel)
        cartProducts.append(card)
        function update() {
            count.textContent = "Продуктов: " + selectedCount(item) + " из " + item.ingredients.length
            price.textContent = money(dishPrice(item))
            saveCart()
        }
        count.textContent = "Продуктов: " + selectedCount(item) + " из " + item.ingredients.length
        price.textContent = money(dishPrice(item))
    })
    updateSummary()
}

function shoppingList() {
    const products = []
    cart.forEach(item => {
        getDish(item.id).ingredients.forEach((ingredient, index) => {
            if (!item.ingredients[index].selected) return
            const quantity = item.ingredients[index].quantity * item.portions
            const existing = products.find(product => product.name.toLowerCase() === ingredient.name.toLowerCase() && product.unit === ingredient.unit)
            if (existing) existing.quantity += quantity
            else products.push({ name: ingredient.name, unit: ingredient.unit, quantity })
        })
    })
    return products
}

function updateSummary() {
    if (!cartProducts) return
    const count = shoppingList().length
    document.getElementById("num_dish").textContent = cart.length
    document.getElementById("num_product").textContent = count
    document.getElementById("num_result").textContent = money(cartTotal())
    document.getElementById("count_of_products").textContent = cart.length + " " + word(cart.length, "блюдо", "блюда", "блюд") + " · " + count + " " + word(count, "продукт", "продукта", "продуктов")
    document.getElementById("btn_make_order").disabled = !count
    document.getElementById("btn_copy_list").disabled = !count
}

async function copyShoppingList() {
    const products = shoppingList()
    if (!products.length) return showToast("Сначала выберите продукты")
    const text = "Список продуктов Buy&Cook\n" + products.map((product, index) => (index + 1) + ". " + product.name + " — " + numberText(product.quantity) + " " + product.unit).join("\n")
    try {
        if (!navigator.clipboard) throw new Error("Clipboard unavailable")
        await navigator.clipboard.writeText(text)
        showToast("Список продуктов скопирован")
    } catch {
        const dialog = makeDialog("copy_dialog", "copy_title")
        const title = makeElement("h2", "dialog_title", "Список продуктов")
        title.id = "copy_title"
        const area = makeElement("textarea", "copy_area")
        area.value = text
        area.readOnly = true
        area.setAttribute("aria-label", "Список продуктов для копирования")
        dialog.append(closeButton(dialog), title, makeElement("p", "muted", "Автоматическое копирование недоступно. Выделите список и нажмите Ctrl+C или ⌘C."), area, makeButton("Выделить список", "primary_button", () => area.select()))
        dialog.addEventListener("close", () => dialog.remove(), { once: true })
        openDialog(dialog)
        area.select()
    }
}
function fieldError(input, message) {
    const old = document.getElementById(input.id + "_error")
    if (old) old.remove()
    input.classList.toggle("invalid", Boolean(message))
    input.setAttribute("aria-invalid", Boolean(message))
    if (!message) {
        input.removeAttribute("aria-describedby")
        return
    }
    const error = makeElement("span", "field_error", message)
    error.id = input.id + "_error"
    input.setAttribute("aria-describedby", error.id)
    input.after(error)
}
function checkRequired(form) {
    let firstInvalid = null
    form.querySelectorAll("[required]").forEach(input => {
        let message = ""
        if (input.type === "file" ? !input.files.length : !input.value.trim()) {
            const label = form.querySelector('label[for="' + input.id + '"]')
            message = input.type === "file" ? "Выберите изображение" : "Заполните поле «" + label.textContent.replace(/\s*\*$/, "") + "»"
        }
        fieldError(input, message)
        if (message && !firstInvalid) firstInvalid = input
    })
    if (firstInvalid) firstInvalid.focus()
    return !firstInvalid
}
function setupForms() {
    document.querySelectorAll("form").forEach(form => {
        form.noValidate = true
        form.addEventListener("input", event => {
            if (event.target.id) fieldError(event.target, "")
        })
    })
    const form = document.getElementById("form_order")
    if (!form) return
    form.querySelectorAll("label").forEach(label => {
        const input = document.getElementById(label.htmlFor)
        const group = makeElement("div", "form_field")
        if (input.id === "order_address" || input.id === "order_number") group.classList.add("full_width")
        label.before(group)
        group.append(label, input)
    })
    const autocomplete = { order_name: "given-name", order_surname: "family-name", order_address: "street-address", order_number: "tel" }
    form.querySelectorAll("input").forEach(input => { input.autocomplete = autocomplete[input.id] })
    const dialog = document.getElementById("form_make_order")
    setupDialog(dialog)
    dialog.prepend(closeButton(dialog))
    dialog.querySelector("h1").id = "order_title"
    dialog.setAttribute("aria-labelledby", "order_title")
    document.getElementById("btn_copy_list").addEventListener("click", copyShoppingList)
    document.getElementById("btn_make_order").addEventListener("click", () => {
        if (!shoppingList().length) return
        const summary = document.getElementById("order_summary")
        summary.replaceChildren()
        cart.forEach(item => {
            const row = makeElement("div", "order_summary_item")
            row.append(makeElement("span", "", getDish(item.id).name + " · " + portionsText(item.portions)), makeElement("span", "", money(dishPrice(item))))
            summary.append(row)
        })
        summary.append(makeElement("p", "order_total", "Итого: " + money(cartTotal())))
        openDialog(dialog)
    })
    form.addEventListener("submit", event => {
        event.preventDefault()
        let valid = checkRequired(form)
        const phone = document.getElementById("order_number")
        const digits = phone.value.replace(/\D/g, "")
        if (phone.value.trim() && (!/^[+\d\s()-]+$/.test(phone.value) || digits.length < 10 || digits.length > 15)) {
            fieldError(phone, "Введите номер телефона: от 10 до 15 цифр")
            if (valid) phone.focus()
            valid = false
        }
        if (!valid) return
        if (!shoppingList().length) return showToast("Сначала выберите продукты")
        const name = document.getElementById("order_name").value.trim()
        const surname = document.getElementById("order_surname").value.trim()
        const order = {
            id: Date.now(),
            date: new Date().toISOString(),
            name,
            surname,
            address: document.getElementById("order_address").value.trim(),
            phone: phone.value.trim(),
            dishes: cart.map(item => ({ id: item.id, name: getDish(item.id).name, portions: item.portions, price: dishPrice(item) })),
            products: shoppingList(),
            total: cartTotal()
        }
        const orders = readStorage("buycook_orders")
        orders.push(order)
        if (!saveStorage("buycook_orders", orders)) return
        cart = []
        saveCart()
        renderCart()
        form.reset()
        const title = makeElement("h2", "dialog_title", "Заказ создан!")
        title.id = "success_title"
        successDialog.replaceChildren(closeButton(successDialog), makeElement("div", "success_mark", "✓"), title, makeElement("p", "", "Заказ для «" + name + " " + surname + "» успешно создан."), makeElement("p", "muted", "Номер заказа: " + order.id), makeButton("Вернуться в каталог", "primary_button", () => { location.href = "index.html" }))
        openDialog(successDialog)
        showToast("Заказ создан!")
    })
}
function closeMenu() {
    document.querySelector(".menu").classList.remove("is_open")
    document.getElementById("list").setAttribute("aria-expanded", "false")
}
function setupNavigation() {
    document.getElementById("buy_cook").href = "index.html"
    const menu = document.querySelector(".menu")
    menu.id = "navigation_menu"
    const list = document.getElementById("list")
    list.setAttribute("aria-label", "Открыть меню")
    list.setAttribute("aria-expanded", "false")
    list.setAttribute("aria-controls", menu.id)
    list.addEventListener("click", () => list.setAttribute("aria-expanded", menu.classList.toggle("is_open")))
    document.addEventListener("click", event => {
        if (!menu.contains(event.target) && !list.contains(event.target)) closeMenu()
    })
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeMenu()
    })
    const basket = document.getElementById("cart")
    basket.setAttribute("aria-label", "Открыть корзину")
    const badge = makeElement("span", "cart_badge")
    badge.id = "cart_badge"
    badge.hidden = true
    basket.append(badge)
    basket.addEventListener("click", () => { location.href = "cart.html" })
    document.getElementById("cart_dial").addEventListener("click", () => { location.href = "cart.html" })
    document.getElementById("star").addEventListener("click", () => setCatalogView(true))
    document.getElementById("plus").addEventListener("click", () => openDialog(document.getElementById("add_recipe")))
    if (catalog) {
        const toolbar = makeElement("div", "catalog_toolbar")
        const back = makeButton("← Весь каталог", "text_button", () => setCatalogView(false))
        back.id = "catalog_back"
        back.hidden = true
        const count = makeElement("span", "muted")
        count.id = "catalog_count"
        count.setAttribute("aria-live", "polite")
        toolbar.append(back, count)
        catalog.before(toolbar)
    }
    
}
function readPhoto(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => reject(new Error("Не удалось прочитать изображение"))
        reader.onload = () => {
            const image = new Image()
            image.onerror = () => reject(new Error("Выберите исправное изображение JPG, PNG или WebP"))
            image.onload = () => {
                const scale = Math.min(1, 800 / Math.max(image.width, image.height))
                const canvas = document.createElement("canvas")
                canvas.width = Math.round(image.width * scale)
                canvas.height = Math.round(image.height * scale)
                canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height)
                resolve(canvas.toDataURL("image/jpeg", 0.8))
            }
            image.src = reader.result
        }
        reader.readAsDataURL(file)
    })
}
function setupSuggestions() {
    const dialog = document.getElementById("add_recipe")
    setupDialog(dialog)
    dialog.prepend(closeButton(dialog))
    dialog.querySelector("h1").id = "suggestion_title"
    dialog.setAttribute("aria-labelledby", "suggestion_title")
    const tabs = ["idea", "only_rec", "full_dish"]
    function tabButton(tab) {
        return document.getElementById(tab === "full_dish" ? "full_dish_recipe" : tab + "_recipe")
    }
    function selectTab(selected) {
        tabs.forEach(tab => {
            dialog.querySelector("." + tab).hidden = tab !== selected
            tabButton(tab).classList.toggle("active_tab", tab === selected)
            tabButton(tab).setAttribute("aria-pressed", tab === selected)
        })
    }
    tabs.forEach(tab => {
        tabButton(tab).classList.add("suggestion_tab")
        tabButton(tab).addEventListener("click", () => selectTab(tab))
    })
    selectTab("idea")
    dialog.querySelector(".idea").addEventListener("submit", event => {
        event.preventDefault()
        if (!checkRequired(event.target)) return
        const ideas = readStorage("buycook_suggestions")
        ideas.push({ type: "idea", text: document.getElementById("idea_text").value.trim(), date: new Date().toISOString() })
        if (!saveStorage("buycook_suggestions", ideas)) return
        event.target.reset()
        dialog.close()
        showToast("Идея сохранена. Спасибо!")
    })
    dialog.querySelector(".only_rec").addEventListener("submit", event => {
        event.preventDefault()
        if (!checkRequired(event.target)) return
        const recipes = readStorage("buycook_suggestions")
        recipes.push({ type: "recipe", name: document.getElementById("only_rec_name").value.trim(), recipe: document.getElementById("only_rec_rec").value.trim(), ingredients: document.getElementById("only_rec_list").value.trim(), date: new Date().toISOString() })
        if (!saveStorage("buycook_suggestions", recipes)) return
        event.target.reset()
        dialog.close()
        showToast("Рецепт сохранён. Спасибо!")
    })
    const fullForm = dialog.querySelector(".full_dish")
    const products = document.getElementById("full_dish_list")
    products.placeholder = "Лапша — 300 г\nГовядина — 400 г"
    document.getElementById("full_dish_cost").after(makeElement("small", "muted", "Примерная цена делится поровну между продуктами. Предложения и новые блюда сохраняются в этом браузере."))
    fullForm.addEventListener("submit", async event => {
        event.preventDefault()
        if (!checkRequired(fullForm)) return
        const portionInput = document.getElementById("full_dish_num")
        const costInput = document.getElementById("full_dish_cost")
        const photoInput = document.getElementById("full_dish_img")
        const portions = Number(portionInput.value)
        const price = Number(costInput.value)
        if (!Number.isInteger(portions) || portions < 1 || portions > 20) {
            fieldError(portionInput, "Введите целое количество порций от 1 до 20")
            return portionInput.focus()
        }
        if (!costInput.value.trim() || !Number.isFinite(price) || price < 0) {
            fieldError(costInput, "Введите стоимость от 0 ₽")
            return costInput.focus()
        }
        const lines = products.value.split(/\n/).map(line => line.trim()).filter(Boolean)
        const ingredients = []
        for (const line of lines) {
            const parts = line.match(/^(.+?)\s+[—–-]\s+(.+)$/)
            if (!parts || !/^(\d|по вкусу)/i.test(parts[2])) {
                fieldError(products, "Каждый продукт с новой строки, например: Помидоры — 300 г")
                return products.focus()
            }
            const quantity = parseAmount(parts[2]).quantity
            if (!Number.isFinite(quantity) || quantity <= 0) {
                fieldError(products, "Количество продукта должно быть больше нуля")
                return products.focus()
            }
            ingredients.push({ name: parts[1], amount: parts[2], estimated_cost_rub: Math.floor(price / lines.length * 100) / 100 })
        }
        if (!ingredients.length) return fieldError(products, "Добавьте хотя бы один продукт")
        ingredients[ingredients.length - 1].estimated_cost_rub = Math.round((price - ingredients.slice(0, -1).reduce((sum, ingredient) => sum + ingredient.estimated_cost_rub, 0)) * 100) / 100
        const file = photoInput.files[0]
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
            fieldError(photoInput, "Выберите JPG, PNG или WebP размером до 5 МБ")
            return photoInput.focus()
        }
        const submit = document.getElementById("btn_send_full_dish")
        submit.disabled = true
        try {
            const dish = {
                id: "user_" + Date.now(),
                name: document.getElementById("full_dish_name").value.trim(),
                portions,
                time: null,
                recipe: document.getElementById("full_dish_rec").value.split(/\n/).map(step => step.trim()).filter(Boolean),
                ingredients,
                total_price: price,
                image: await readPhoto(file)
            }
            if (!saveStorage("buycook_dishes", [...userDishes, dish])) return
            userDishes.push(dish)
            dishes.push(normalizeDish(dish))
            fullForm.reset()
            dialog.close()
            if (catalog) setCatalogView(false)
            showToast("Новое блюдо добавлено в каталог")
        } catch (error) {
            fieldError(photoInput, error.message)
        } finally {
            submit.disabled = false
        }
    })
}
async function loadMenu() {
    const container = catalog || cartProducts
    container.replaceChildren(makeElement("p", "loading_message", "Загружаем блюда…"))
    try {
        const response = await fetch("menu.json")
        if (!response.ok) throw new Error("Menu unavailable")
        const data = await response.json()
        if (!Array.isArray(data.dishes)) throw new Error("Invalid menu")
        userDishes = userDishes.filter(dish => dish && dish.id && dish.name && Array.isArray(dish.ingredients) && Array.isArray(dish.recipe))
        dishes = [...data.dishes, ...userDishes].map(normalizeDish)
        favorites = favorites.filter(id => getDish(id))
        const savedIds = new Set()
        cart = cart.filter(item => {
            if (!item || !getDish(item.id) || savedIds.has(String(item.id))) return false
            savedIds.add(String(item.id))
            return true
        }).map(item => {
            const defaults = makeCartItem(getDish(item.id))
            const portions = Number(item.portions)
            defaults.portions = Number.isInteger(portions) ? Math.max(1, Math.min(20, portions)) : defaults.portions
            defaults.ingredients.forEach((ingredient, index) => {
                const saved = item.ingredients && item.ingredients[index]
                if (!saved) return
                if (Number.isFinite(saved.quantity) && saved.quantity > 0) ingredient.quantity = saved.quantity
                ingredient.selected = saved.selected !== false
            })
            return defaults
        })
        renderCatalog()
        renderCart()
        updateCartButtons()
    } catch {
        container.replaceChildren(emptyState("Не удалось загрузить меню", "Проверьте наличие menu.json. Запускайте сайт через Live Server или локальный сервер.", "Повторить", loadMenu))
        if (cartProducts) {
            document.getElementById("btn_make_order").disabled = true
            document.getElementById("btn_copy_list").disabled = true
        }
    }
}

function setupIdeas() {
    const dialog = document.getElementById("ideas_dialog")

    setupDialog(dialog)
    dialog.prepend(closeButton(dialog))

    document
        .getElementById("ideas")
        .addEventListener("click", openIdeas)
}


setupNavigation()
setupForms()
setupSuggestions()
setupIdeas()
loadMenu()


function findDishes(query) {
    const words = query.toLowerCase().replace(/ё/g, "е").trim().split(/\s+/).filter(Boolean)
    return dishes.filter(dish => {
        const text = (dish.name + " " + dish.ingredients.map(ingredient => ingredient.name).join(" ")).toLowerCase().replace(/ё/g, "е")
        return words.every(word => text.includes(word))
    })
}
function searchDishes() {
    searchText = searchInput.value.trim()
    if (!catalog) {
        location.href = "index.html?q=" + encodeURIComponent(searchText)
        return
    }
    const parameters = new URLSearchParams()
    if (favoritesOnly) parameters.set("view", "favorites")
    if (searchText) parameters.set("q", searchText)
    history.replaceState(null, "", "index.html" + (parameters.size ? "?" + parameters : ""))
    renderCatalog()
}
searchInput.value = searchText
searchInput.setAttribute("aria-label", "Поиск по названию блюда или ингредиенту")
document.querySelector(".search").addEventListener("submit", event => {
    event.preventDefault()
    searchDishes()
})
if (catalog) searchInput.addEventListener("input", searchDishes)
const searchIcon = document.querySelector(".search .headers_img")
const searchButton = makeElement("button", "search_button")
searchButton.type = "submit"
searchButton.setAttribute("aria-label", "Найти блюдо")
searchIcon.replaceWith(searchButton)
searchButton.append(searchIcon)

function openIdeas() {
    const suggestions = readStorage("buycook_suggestions")
    const dialog = document.getElementById("ideas_dialog")
    const list = document.getElementById("ideas_list")
    list.replaceChildren()
    if (!suggestions.length) {
        list.append(
            makeElement(
                "p",
                "muted",
                "Здесь пока нет предложенных идей."
            )
        )
    }
    suggestions.forEach(suggestion => {
        const card = makeElement("article", "idea_card")
        const type = makeElement(
            "span",
            "idea_type",
            suggestion.type === "idea" ? "Идея" : "Рецепт"
        )
        const title = makeElement(
            "h2",
            "idea_name",
            suggestion.name || "Идея блюда"
        )
        const text = makeElement(
            "p",
            "idea_text",
            suggestion.text || suggestion.recipe
        )
        card.append(type, title, text)
        list.append(card)
    })
    openDialog(dialog)
}