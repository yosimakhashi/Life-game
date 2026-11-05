// Shared by the page and the service worker, so the daily reminder shows
// the same affirmation the app shows. Each entry: [Malayalam, English meaning].
self.AFFIRMATIONS = [
    ['ഞാൻ ഓരോ ദിവസവും പഠിക്കുന്നു, ഓരോ ദിവസവും വളരുന്നു.', 'I learn every day, and I grow every day.'],
    ['എന്റെ മനസ്സ് ശാന്തവും ശ്രദ്ധയുള്ളതുമാണ്.', 'My mind is calm and focused.'],
    ['കഠിനാധ്വാനം എന്നെ എന്റെ ലക്ഷ്യത്തിലേക്ക് അടുപ്പിക്കുന്നു.', 'Hard work brings me closer to my goal.'],
    ['ഇന്ന് ഞാൻ പഠിക്കുന്ന ഓരോ വാക്കും നാളത്തെ എന്റെ വിജയത്തിന്റെ അടിത്തറയാണ്.', 'Every word I learn today is the foundation of my success tomorrow.'],
    ['എനിക്ക് പ്രയാസമുള്ള വിഷയങ്ങളും പഠിച്ചെടുക്കാൻ കഴിയും.', 'I can master even the hardest subjects.'],
    ['തെറ്റുകൾ എന്നെ തളർത്തുന്നില്ല; അവ എന്നെ പഠിപ്പിക്കുന്നു.', 'Mistakes do not break me; they teach me.'],
    ['ഞാൻ എന്റെ സമയത്തെ ബഹുമാനിക്കുന്നു, അത് പഠനത്തിനായി നന്നായി ഉപയോഗിക്കുന്നു.', 'I respect my time and use it well for studying.'],
    ['പുസ്തകം തുറക്കുമ്പോൾ എന്റെ ശ്രദ്ധ മുഴുവൻ അതിലാണ്.', 'When I open a book, all my attention is on it.'],
    ['ചെറിയ ചുവടുകൾ വലിയ വിജയങ്ങളിലേക്ക് നയിക്കുന്നു.', 'Small steps lead to big victories.'],
    ['ഇന്നലത്തെക്കാൾ ഒരു പടി മുന്നിലാണ് ഇന്ന് ഞാൻ.', 'Today I am one step ahead of yesterday.'],
    ['എന്റെ ഓർമ്മശക്തി ദിനംപ്രതി മെച്ചപ്പെടുന്നു.', 'My memory gets better day by day.'],
    ['പരീക്ഷകൾ എന്നെ ഭയപ്പെടുത്തുന്നില്ല; ഞാൻ തയ്യാറാണ്.', 'Exams do not frighten me; I am prepared.'],
    ['അറിവാണ് എന്റെ ഏറ്റവും വലിയ സമ്പത്ത്.', 'Knowledge is my greatest wealth.'],
    ['ശ്രദ്ധ തെറ്റിക്കുന്നവയിൽ നിന്ന് ഞാൻ അകന്നു നിൽക്കുന്നു.', 'I stay away from distractions.'],
    ['എന്റെ സ്വപ്നങ്ങൾക്കായി ഞാൻ ഇന്ന് പഠിക്കുന്നു.', 'I study today for my dreams.'],
    ['സംശയങ്ങൾ ചോദിക്കാൻ എനിക്ക് മടിയില്ല.', 'I am never shy to ask my doubts.'],
    ['ഓരോ അധ്യായവും പൂർത്തിയാക്കുമ്പോൾ എന്റെ ആത്മവിശ്വാസം കൂടുന്നു.', 'My confidence grows with every chapter I finish.'],
    ['ഞാൻ എന്നെത്തന്നെ വിശ്വസിക്കുന്നു.', 'I believe in myself.'],
    ['സ്ഥിരതയാണ് എന്റെ ശക്തി.', 'Consistency is my strength.'],
    ['പഠനം എനിക്ക് ഭാരമല്ല, ഒരു സന്തോഷമാണ്.', 'Studying is not a burden to me; it is a joy.'],
    ['ഞാൻ മറ്റുള്ളവരുമായി എന്നെ താരതമ്യം ചെയ്യുന്നില്ല; എന്റെ വഴിയിലൂടെ ഞാൻ മുന്നേറുന്നു.', 'I do not compare myself with others; I move ahead on my own path.'],
    ['ഇന്നത്തെ അധ്വാനം നാളത്തെ അഭിമാനമാണ്.', 'Today\'s effort is tomorrow\'s pride.'],
    ['എന്റെ ബുദ്ധി മൂർച്ചയുള്ളതും വ്യക്തവുമാണ്.', 'My mind is sharp and clear.'],
    ['ഞാൻ മടി മാറ്റിവെച്ച് ഇപ്പോൾ തന്നെ തുടങ്ങുന്നു.', 'I put laziness aside and start right now.'],
    ['തോൽവി ഒരു അവസാനമല്ല, ഒരു പുതിയ തുടക്കമാണ്.', 'Failure is not an end; it is a new beginning.'],
    ['ഞാൻ പഠിക്കുന്നത് എനിക്കു വേണ്ടിയാണ്, എന്റെ ഭാവിക്കു വേണ്ടിയാണ്.', 'I study for myself and for my future.'],
    ['ഓരോ മണിക്കൂർ പഠനവും എന്നെ എന്റെ സ്വപ്നത്തോട് അടുപ്പിക്കുന്നു.', 'Every hour of study brings me closer to my dream.'],
    ['ഞാൻ ക്ഷമയോടെ പഠിക്കുന്നു; ഫലം തീർച്ചയായും വരും.', 'I study with patience; the results will surely come.'],
    ['എന്റെ പരിശ്രമത്തിൽ ഞാൻ അഭിമാനിക്കുന്നു.', 'I am proud of my effort.'],
    ['എനിക്ക് മനസ്സിലാകാത്തത് ഇന്ന് ഞാൻ മനസ്സിലാക്കും.', 'Whatever I have not understood, I will understand today.'],
    ['അച്ചടക്കമാണ് എന്നെ വിജയിയാക്കുന്നത്.', 'Discipline is what makes me a winner.'],
    ['എന്റെ മേശ, എന്റെ പുസ്തകങ്ങൾ, എന്റെ ലക്ഷ്യം — ഞാൻ തയ്യാറാണ്.', 'My desk, my books, my goal — I am ready.'],
    ['ഞാൻ ആവർത്തിച്ച് പഠിക്കുന്നു, അതുകൊണ്ട് ഞാൻ മറക്കുന്നില്ല.', 'I revise again and again, so I do not forget.'],
    ['ഓരോ ചോദ്യവും എനിക്ക് പഠിക്കാനുള്ള ഒരു അവസരമാണ്.', 'Every question is a chance for me to learn.'],
    ['ഞാൻ എന്റെ ഫോൺ മാറ്റിവെച്ച് എന്റെ ഭാവിയിൽ ശ്രദ്ധിക്കുന്നു.', 'I put my phone away and focus on my future.'],
    ['വിജയം ഒരു ദിവസം കൊണ്ടല്ല, ദിവസവുമുള്ള പരിശ്രമം കൊണ്ടാണ്.', 'Success does not come in a day; it comes from daily effort.'],
    ['എനിക്ക് കഴിയും, ഞാൻ ചെയ്യും.', 'I can, and I will.'],
    ['ഇന്ന് ഞാൻ എന്റെ ഏറ്റവും മികച്ചത് നൽകും.', 'Today I will give my very best.'],
    ['പഠിക്കുമ്പോൾ എന്റെ മനസ്സ് ഒരു വിളക്കുപോലെ തെളിയുന്നു.', 'When I study, my mind shines like a lamp.'],
    ['ക്ഷീണം തോന്നിയാലും ഞാൻ പിന്മാറില്ല.', 'Even when I feel tired, I will not give up.'],
    ['എന്റെ മാതാപിതാക്കളുടെ സ്വപ്നങ്ങളും എന്റെ സ്വപ്നങ്ങളും ഞാൻ യാഥാർത്ഥ്യമാക്കും.', 'I will make my parents\' dreams and my own come true.'],
    ['എല്ലാ ദിവസവും അല്പമെങ്കിലും ഞാൻ പഠിക്കും.', 'I will study at least a little every single day.'],
    ['എന്റെ ഏകാഗ്രത ദിവസം തോറും വർധിക്കുന്നു.', 'My concentration grows day by day.'],
    ['അറിവ് നേടുന്തോറും എന്റെ ലോകം വലുതാകുന്നു.', 'The more I learn, the bigger my world becomes.'],
    ['പരീക്ഷാഹാളിൽ ഞാൻ ശാന്തമായും ആത്മവിശ്വാസത്തോടെയും ഇരിക്കുന്നു.', 'In the exam hall I sit calm and confident.'],
    ['ഇന്ന് തുടങ്ങാൻ ഏറ്റവും നല്ല ദിവസമാണ്.', 'Today is the best day to begin.'],
    ['പ്രയാസങ്ങൾ എന്റെ കരുത്ത് കൂട്ടുന്നു.', 'Hardships only add to my strength.'],
    ['ഞാൻ എന്റെ ലക്ഷ്യം എപ്പോഴും കണ്മുന്നിൽ കാണുന്നു.', 'I always keep my goal before my eyes.'],
    ['എന്റെ പഠനത്തിന് ഞാൻ തന്നെയാണ് ഉത്തരവാദി.', 'I am the one responsible for my studies.'],
    ['ഓരോ പുതിയ കാര്യവും പഠിക്കുന്നത് എനിക്ക് ആവേശമാണ്.', 'Learning every new thing excites me.'],
    ['ഞാൻ നന്നായി ഉറങ്ങുന്നു, നന്നായി പഠിക്കുന്നു, നന്നായി ഓർക്കുന്നു.', 'I sleep well, study well and remember well.'],
    ['എന്റെ കഴിവുകൾക്ക് പരിധിയില്ല.', 'My abilities have no limit.'],
    ['ഇന്ന് ചെയ്യേണ്ടത് ഞാൻ നാളത്തേക്ക് മാറ്റിവെക്കില്ല.', 'I will not put off until tomorrow what I must do today.'],
    ['ഓരോ പേജും എന്നെ വിജയത്തിലേക്ക് ഒരു പടി കൂടി അടുപ്പിക്കുന്നു.', 'Every page brings me one step closer to success.'],
    ['എനിക്ക് പഠിക്കാൻ ഇഷ്ടമാണ്.', 'I love to learn.'],
    ['വീണാലും ഞാൻ എഴുന്നേറ്റ് വീണ്ടും ശ്രമിക്കും.', 'Even if I fall, I will rise and try again.'],
    ['എന്റെ ഭാവി ഞാൻ ഇന്ന് എഴുതുകയാണ്.', 'I am writing my future today.'],
    ['ശാന്തമായ മനസ്സോടെ ഞാൻ ഓരോ പ്രശ്നവും പരിഹരിക്കുന്നു.', 'With a calm mind I solve every problem.'],
    ['അധ്യാപകരിൽ നിന്നും പുസ്തകങ്ങളിൽ നിന്നും ജീവിതത്തിൽ നിന്നും ഞാൻ പഠിക്കുന്നു.', 'I learn from my teachers, from books and from life.'],
    ['എന്റെ കഠിനാധ്വാനം ഒരിക്കലും പാഴാകില്ല.', 'My hard work will never go to waste.'],
    ['ഓരോ ദിവസവും ഞാൻ കൂടുതൽ മികച്ച വിദ്യാർത്ഥിയായി മാറുന്നു.', 'Every day I become a better student.'],
    ['ഇന്ന് ഞാൻ പഠിക്കുന്നത് നാളെ എന്നെ ഉയർത്തും.', 'What I learn today will lift me up tomorrow.'],
    ['മനസ്സുവെച്ചാൽ എനിക്ക് നേടാനാകാത്തതൊന്നുമില്ല.', 'When I set my mind to it, there is nothing I cannot achieve.'],
    ['ഇനി ഞാൻ പിന്നോട്ടില്ല; മുന്നോട്ട് മാത്രം.', 'No turning back now; only forward.'],
];

// A small, doable study goal for each day.
self.STUDY_TASKS = [
    ['ഫോൺ മാറ്റിവെച്ച് 25 മിനിറ്റ് ശ്രദ്ധയോടെ പഠിക്കുക.', 'Study for 25 minutes with your phone put away.'],
    ['ഇന്നലെ പഠിച്ചത് 10 മിനിറ്റ് ആവർത്തിക്കുക.', 'Revise yesterday\'s lesson for 10 minutes.'],
    ['ഒരു അധ്യായത്തിന്റെ ചുരുക്കം സ്വന്തം വാക്കുകളിൽ എഴുതുക.', 'Write a summary of one chapter in your own words.'],
    ['മനസ്സിലാകാത്ത ഒരു സംശയം അധ്യാപകരോടോ കൂട്ടുകാരോടോ ചോദിക്കുക.', 'Ask a teacher or a friend about one doubt.'],
    ['പഠിച്ച ഒരു കാര്യം മറ്റൊരാൾക്ക് പറഞ്ഞുകൊടുക്കുക.', 'Explain one thing you learned to someone else.'],
    ['5 പുതിയ വാക്കുകളോ സൂത്രവാക്യങ്ങളോ ഹൃദിസ്ഥമാക്കുക.', 'Memorise 5 new words or formulas.'],
    ['പഠനമേശ വൃത്തിയാക്കി ഒരുക്കുക.', 'Clear and set up your study desk.'],
    ['നാളത്തെ പഠനത്തിനുള്ള ഒരു ചെറിയ പട്ടിക തയ്യാറാക്കുക.', 'Make a short plan for tomorrow\'s study.'],
    ['ഒരു പഴയ ചോദ്യപേപ്പറിൽ നിന്ന് 5 ചോദ്യങ്ങൾ ചെയ്യുക.', 'Answer 5 questions from an old question paper.'],
    ['ഏറ്റവും പ്രയാസമുള്ള വിഷയം ആദ്യം 20 മിനിറ്റ് പഠിക്കുക.', 'Study your hardest subject first, for 20 minutes.'],
    ['പഠിച്ചത് ഒരു മൈൻഡ് മാപ്പായി വരയ്ക്കുക.', 'Draw what you learned as a mind map.'],
    ['ഉറങ്ങുന്നതിനു മുൻപ് ഇന്ന് പഠിച്ച 3 കാര്യങ്ങൾ ഓർത്തെടുക്കുക.', 'Before sleeping, recall 3 things you learned today.'],
];

// Whole days since 1970 for the local calendar date, so the affirmation
// changes at the user's midnight, not UTC midnight.
self.dayNumber = function (d) {
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
};
self.affirmationFor = function (day) {
    const n = self.AFFIRMATIONS.length;
    return ((day % n) + n) % n;
};
self.taskFor = function (day) {
    const n = self.STUDY_TASKS.length;
    return (((day * 5) % n) + n) % n;
};
