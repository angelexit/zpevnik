// === index_interactive.js ===

$(document).ready(function () {
  // === 1. Vyhledávání ===
  $('#search-box').on('input', function () {
    const filter = $(this).val().toLowerCase();
    $('#artist-list li').each(function () {
      const name = $(this).text().toLowerCase();
      $(this).toggle(name.includes(filter));
    });
  });

// === 2. Přepínání světlý/tmavý režim ===
const savedTheme = localStorage.getItem('theme');
// Při načtení stránky aplikuj uložený motiv. Pokud je 'dark', přidáme 'dark-mode'.
if (savedTheme === 'dark') {
  $('body').addClass('dark-mode');
}
// Pokud savedTheme není 'dark' (např. 'light' nebo null), tělo zůstane ve výchozím světlém režimu (který je definován v :root).

$('#toggle-theme').on('click', function () {
  $('body').toggleClass('dark-mode'); // Přidá/odebere třídu 'dark-mode'
  const isDarkMode = $('body').hasClass('dark-mode');
  localStorage.setItem('theme', isDarkMode ? 'dark' : 'light'); // Uloží 'dark' nebo 'light'
});

  // === 3. Zvýraznění navštívených odkazů ===
  const visited = JSON.parse(localStorage.getItem('visitedArtists') || '[]');
  visited.forEach(href => {
    $(`#artist-list a[href='${href}']`).addClass('visited');
  });

  $('#artist-list a').on('click', function () {
    const href = $(this).attr('href');
    if (!visited.includes(href)) {
      visited.push(href);
      localStorage.setItem('visitedArtists', JSON.stringify(visited));
    }
  });

  // === 4. Reset navštívených ===
  $('#reset-visited').on('click', function () {
    localStorage.removeItem('visitedArtists');
    $('#artist-list a').removeClass('visited');
  });
});