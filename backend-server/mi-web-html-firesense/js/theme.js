function toggleTheme(){
  var l=document.body.classList.toggle('light');
  document.getElementById('themeBtn').textContent=l?'→ DARK':'→ LIGHT';
}

// Sempre entra en dark (no guardar ni llegir localStorage)
document.getElementById('themeBtn').textContent='→ LIGHT';
