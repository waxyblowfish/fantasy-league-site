# How to Edit the Notice Board

The notice board appears on the home page and can be edited by clicking the edit button.

## Quick Edit (In Browser):
1. Go to the home page
2. Click the blue edit icon (✏️) on the Notice Board
3. Type your message
4. Click the save icon (💾)

Your notice will be saved in the browser and persist across visits!

## Advanced Edit (In Code):
If you want to change the default notice that appears for new visitors:

1. Open `src/App.jsx`
2. Find line 11: `const INITIAL_NOTICE = "🏈 Welcome to the 2026-2027 season! If you have any questions or see any errors let Noah know! /nHave fun and good luck to everyone!";`
3. Change the text between the quotes
4. Save and deploy

The notice board supports:
- Multiple lines (press Enter)
- Emojis 🏈🏆🎉
- Any text you want!

Examples:
- "🏈 Week 5: Trade deadline is this Sunday!"
- "🎉 Congrats to Team Smith for highest score this week!"
- "⚠️ Reminder: Set your lineups before Thursday!"
