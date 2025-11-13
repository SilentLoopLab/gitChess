<div style="color:#6f1515">

<h1>gitChess</h1>
<h3>A full local 1vs1 chess game built with pure JavaScript</h3>

<hr>

<h2>Overview</h2>

<p><b>gitChess</b> is a fully functional browser-based chess game built entirely with pure <b>JavaScript, HTML, and CSS</b>.  
The game runs directly in your browser and supports complete <b>1 vs 1</b> chess on a single computer, including all standard rules.</p>

<p><b>Play instantly:</b><br>
➡️ <a href="https://silentlooplab.github.io/gitChess/" style="color:#6f1515"><b>https://silentlooplab.github.io/gitChess/</b></a></p>

<hr>

<h2>Features</h2>

<ul>
  <li>✔️ Full 1 vs 1 local chess gameplay</li>
  <li>✔️ Legal move validation for all pieces</li>
  <li>✔️ Castling (king-side & queen-side)</li>
  <li>✔️ En passant capture</li>
  <li>✔️ Pawn promotion with UI selection</li>
  <li>✔️ Check, checkmate, and stalemate detection</li>
  <li>✔️ Move history sidebar with auto-scroll</li>
  <li>✔️ Undo & Redo functions using two stacks</li>
  <li>✔️ Player timers (e.g., 5 minutes each)</li>
  <li>✔️ “Ready” buttons for White and Black</li>
  <li>✔️ Game over modal with result display</li>
  <li>✔️ Clean UI with move highlighting</li>
  <li>✔️ Pure JavaScript (no frameworks or dependencies)</li>
</ul>

<hr>

<h2>Project Structure</h2>

<pre>
gitChess/
├─ engine/          # Core game logic (rules, validation, state)
├─ moves/           # Move generation helpers
├─ images/          # Piece images
├─ highlight/       # Square highlighting
├─ favicon/         # Favicon files
├─ chess.img/       # Additional UI images
├─ board.js         # Board rendering and DOM initialization
├─ pieces.js        # Piece classes / piece utilities
├─ promotion.js     # Pawn promotion UI & logic
├─ buttons.js       # Ready, undo, redo, restart, timers
├─ src.js           # Main initializer & event wiring
├─ styles.css       # UI & board styling
├─ index.html       # Entry point HTML page
</pre>

<hr>

<h2>How to Run</h2>

<p>The game is already deployed online. Just open the link:</p>

<p>➡️ <a href="https://silentlooplab.github.io/gitChess/" style="color:#6f1515"><b>https://silentlooplab.github.io/gitChess/</b></a></p>

<p>No installation or setup required.</p>

<hr>

<h2>How to Play</h2>

<ol>
  <li>Open the game from the link above.</li>
  <li>White and Black click their “Ready” buttons.</li>
  <li>The White timer starts automatically.</li>
  <li>Select a piece → available legal moves are highlighted.</li>
  <li>Click a target square to perform a move.</li>
  <li>Timers switch after each valid move.</li>
  <li>Checkmate or stalemate triggers a game-over modal.</li>
  <li>You can restart the game at any time.</li>
</ol>

<hr>

<h2>Author</h2>

<p><b>SILENTLOOPLAB</b><br>
GitHub: <a href="https://github.com/SILENTLOOPLAB" style="color:#6f1515">https://github.com/SILENTLOOPLAB</a></p>

</div>
