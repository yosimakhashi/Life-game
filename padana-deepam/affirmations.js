// Shared by the page and the service worker, so the daily reminder shows
// the same quote the app shows. Each entry: [Malayalam, English meaning, who said it].
// Quotes without a name are original. Some speak to Athira by name.
self.QUOTES = [
    ['ഇന്ന് നീ ഒഴുക്കുന്ന വിയർപ്പാണ് നാളെ നിന്റെ വിജയത്തിന്റെ തിളക്കം.', 'The sweat you put in today is the shine of your success tomorrow.'],
    ['ഫോൺ നിന്നെ കാത്തിരിക്കും; പക്ഷേ പരീക്ഷ കാത്തിരിക്കില്ല.', 'Your phone will wait for you; the exam will not.'],
    ['വിദ്യകൊണ്ട് പ്രബുദ്ധരാകുക.', 'Become enlightened through education.', 'ശ്രീനാരായണ ഗുരു'],
    ['ആതിരേ, നീ വിചാരിക്കുന്നതിനേക്കാൾ എത്രയോ കരുത്തുള്ളവളാണ് നീ.', 'Athira, you are far stronger than you think.'],
    ['മടി ഇന്ന് സുഖം തരും, നാളെ ദുഃഖവും.', 'Laziness gives comfort today and regret tomorrow.'],
    ['ഒരു മണിക്കൂർ കൂടി ഇരിക്കൂ; ഭാവിയിലെ നീ ഇതിന് നന്ദി പറയും.', 'Sit for one more hour; your future self will thank you.'],
    ['പ്രചോദനം വരുന്നതും കാത്തിരിക്കേണ്ട; പുസ്തകം തുറന്നാൽ അത് പിന്നാലെ വരും.', 'Don\'t wait for motivation; open the book and it will follow.'],
    ['ഇന്ന് കഷ്ടപ്പെട്ടാൽ നാളെ ഇഷ്ടപ്പെട്ട ജീവിതം.', 'Work hard today, and tomorrow you live the life you love.'],
    ['ഒരു പേജ് എങ്കിലും വായിക്കൂ; ഓരോ പേജും ഓരോ പടിയാണ്.', 'Read at least one page; every page is a step forward.'],
    ['ഉറക്കത്തിൽ കാണുന്നതല്ല സ്വപ്നം; നമ്മെ ഉറങ്ങാൻ അനുവദിക്കാത്തതാണ് യഥാർത്ഥ സ്വപ്നം.', 'A dream is not what you see in sleep; it is what does not let you sleep.', 'എ.പി.ജെ. അബ്ദുൽ കലാം'],
    ['പോയ സമയം തിരിച്ചുകിട്ടില്ല; അതുകൊണ്ട് ഇപ്പോൾ തന്നെ പഠിക്കൂ.', 'Lost time never comes back, so study right now.'],
    ['നിന്നെ സംശയിച്ചവർക്കുള്ള ഏറ്റവും നല്ല മറുപടി നിന്റെ മാർക്ക് ആയിരിക്കട്ടെ.', 'Let your marks be the best answer to everyone who doubted you.'],
    ['ക്ഷീണിക്കുമ്പോൾ നിർത്തരുത്; ലക്ഷ്യത്തിലെത്തുമ്പോൾ നിർത്തൂ.', 'Don\'t stop when you are tired; stop when you are done.'],
    ['നിന്റെ സ്വപ്നം വലുതാണെങ്കിൽ, നിന്റെ ശ്രമവും വലുതാകണം.', 'If your dream is big, your effort must be big too.'],
    ['പരീക്ഷാഫലം ഒരു ദിവസം വരും; അതിനുള്ള ഒരുക്കം ഇന്നാണ്.', 'Results will come one day; the preparation for them is today.'],
    ['ആതിരേ, ഇന്നത്തെ ഈ ഒരു മണിക്കൂർ നാളത്തെ നിന്റെ സ്വപ്നത്തിനുള്ളതാണ്.', 'Athira, this one hour today belongs to your dream of tomorrow.'],
    ['തെറ്റിയ ഉത്തരം ഒരു പരാജയമല്ല, ഒരു പാഠമാണ്.', 'A wrong answer is not a failure; it is a lesson.'],
    ['ഇന്ന് ചെയ്യാനുള്ളത് നാളേക്ക് മാറ്റിവെച്ചാൽ, നാളെ അത് ഇരട്ടി ഭാരമാകും.', 'Put off today\'s work and tomorrow it becomes twice as heavy.'],
    ['ഉണരുക, എഴുന്നേൽക്കുക, ലക്ഷ്യം നേടുംവരെ നിൽക്കാതിരിക്കുക.', 'Arise, awake, and stop not till the goal is reached.', 'സ്വാമി വിവേകാനന്ദൻ'],
    ['ബുദ്ധിമുട്ടുള്ള വിഷയമാണോ? എങ്കിൽ അതിനാണ് ഏറ്റവും കൂടുതൽ സമയം നൽകേണ്ടത്.', 'Is it a hard subject? Then that is the one that deserves the most time.'],
    ['നിന്നെക്കൊണ്ട് കഴിയും എന്ന് ആദ്യം വിശ്വസിക്കേണ്ടത് നീ തന്നെയാണ്.', 'You have to be the first one to believe you can do it.'],
    ['അറിവ് ആർക്കും മോഷ്ടിക്കാൻ കഴിയാത്ത സമ്പത്താണ്.', 'Knowledge is the one wealth no one can steal.'],
    ['ഇന്നത്തെ നിന്റെ ശീലങ്ങളാണ് നാളത്തെ നിന്റെ ജീവിതം.', 'Your habits today become your life tomorrow.'],
    ['\'ഒരു ദിവസം\' അല്ലെങ്കിൽ \'ഒന്നാം ദിവസം\' — നീ തീരുമാനിക്കൂ.', '"One day" or "Day one" — you decide.'],
    ['പഠിക്കാൻ മൂഡ് വേണ്ട; തുടങ്ങാനുള്ള തീരുമാനം മതി.', 'You don\'t need the mood to study; you only need the decision to start.'],
    ['സൂര്യനെപ്പോലെ തിളങ്ങണമെങ്കിൽ, ആദ്യം സൂര്യനെപ്പോലെ ജ്വലിക്കണം.', 'If you want to shine like the sun, first burn like the sun.', 'എ.പി.ജെ. അബ്ദുൽ കലാം'],
    ['ആദ്യത്തെ അഞ്ച് മിനിറ്റാണ് ഏറ്റവും പ്രയാസം. അത് കടന്നാൽ എളുപ്പമാണ്.', 'The first five minutes are the hardest. After that it gets easy.'],
    ['നിന്റെ ലക്ഷ്യം ഓർക്കൂ; എന്തിനാണ് തുടങ്ങിയത് എന്ന് ഓർക്കൂ.', 'Remember your goal; remember why you started.'],
    ['ഇന്ന് ഒഴിവാക്കുന്ന ഓരോ ശ്രദ്ധാഭംഗവും നാളത്തെ നിനക്കുള്ള സമ്മാനമാണ്.', 'Every distraction you skip today is a gift to your tomorrow.'],
    ['കഠിനാധ്വാനത്തിന് പകരം വെക്കാൻ മറ്റൊന്നുമില്ല.', 'There is no substitute for hard work.'],
    ['തുടങ്ങാൻ നീ മിടുക്കിയാകേണ്ടതില്ല; പക്ഷേ മിടുക്കിയാകാൻ തുടങ്ങിയേ തീരൂ.', 'You don\'t have to be brilliant to start, but you have to start to be brilliant.'],
    ['മാർക്ക് ഒരു സംഖ്യ മാത്രമാണ്; പക്ഷേ നീ നേടുന്ന അറിവ് എന്നും നിന്റേതാണ്.', 'Marks are just a number, but the knowledge you gain is yours forever.'],
    ['മനസ്സിലാകുന്നതു വരെ വീണ്ടും വീണ്ടും വായിക്കൂ; ആവർത്തനമാണ് ഓർമ്മയുടെ രഹസ്യം.', 'Read it again and again until you understand; repetition is the secret of memory.'],
    ['ലോകത്തെ മാറ്റാൻ ഉപയോഗിക്കാവുന്ന ഏറ്റവും ശക്തമായ ആയുധം വിദ്യാഭ്യാസമാണ്.', 'Education is the most powerful weapon you can use to change the world.', 'നെൽസൺ മണ്ടേല'],
    ['നിന്റെ പഠനമേശയിലാണ് നിന്റെ ഭാവി ഇന്ന് പണിയപ്പെടുന്നത്.', 'Your future is being built at your study desk today.'],
    ['ഓരോ വിദഗ്ദ്ധനും ഒരിക്കൽ ഒന്നും അറിയാത്ത ഒരു വിദ്യാർത്ഥിയായിരുന്നു.', 'Every expert was once a student who knew nothing.'],
    ['തോൽക്കുന്നത് വീഴുന്നതുകൊണ്ടല്ല, എഴുന്നേൽക്കാത്തതുകൊണ്ടാണ്.', 'You don\'t lose by falling; you lose by not getting up.'],
    ['പഠനം ഒരു ഓട്ടമത്സരമല്ല; നിർത്താതെ നടന്നാൽ മതി.', 'Studying is not a race; just keep walking and never stop.'],
    ['നിന്റെ സ്വപ്നങ്ങൾ നേടാൻ നിനക്ക് കഴിയും, ആതിരേ. തുടങ്ങൂ!', 'You can achieve your dreams, Athira. Begin!'],
    ['ഇന്ന് അൽപം കൂടി ശ്രമിച്ചാൽ, നാളെ അൽപം കൂടി ഉയരത്തിലെത്താം.', 'Try a little more today, and you will rise a little higher tomorrow.'],
    ['വിജയം ഭാഗ്യമല്ല; ദിവസവും ചെയ്യുന്ന ചെറിയ കാര്യങ്ങളുടെ ഫലമാണ്.', 'Success is not luck; it is the result of small things done every day.'],
    ['സംശയം ചോദിക്കാൻ മടിക്കരുത്; ചോദ്യങ്ങളാണ് അറിവിന്റെ താക്കോൽ.', 'Never hesitate to ask a doubt; questions are the key to knowledge.'],
    ['വിദ്യാധനം സർവ്വധനാൽ പ്രധാനം.', 'The wealth of learning is the greatest of all wealth.', 'പഴമൊഴി'],
    ['ഇരുപത് മിനിറ്റ് റീലുകൾക്ക് പകരം ഇരുപത് മിനിറ്റ് പഠനം — ഒരു മാസം കൊണ്ട് വ്യത്യാസം നീ കാണും.', 'Swap twenty minutes of reels for twenty minutes of study — in a month you will see the difference.'],
    ['നിന്റെ ഏറ്റവും വലിയ മത്സരം ഇന്നലത്തെ നിന്നോടാണ്.', 'Your biggest competition is the you of yesterday.'],
    ['ഒരു തുള്ളി വെള്ളം കല്ലിൽ കുഴിയുണ്ടാക്കുന്നത് ശക്തികൊണ്ടല്ല, തുടർച്ചകൊണ്ടാണ്.', 'A drop of water carves stone not by force, but by persistence.'],
    ['ഇന്ന് നീ പഠിക്കുന്നത് ആരും കാണുന്നില്ലായിരിക്കാം; പക്ഷേ നാളെ ഫലം എല്ലാവരും കാണും.', 'No one may see you studying today, but everyone will see the results tomorrow.'],
    ['പരീക്ഷയെ പേടിക്കേണ്ട; ഒരുങ്ങാതിരിക്കുന്നതിനെയാണ് പേടിക്കേണ്ടത്.', 'Don\'t fear the exam; fear being unprepared.'],
    ['ഇന്നത്തെ വേദന നാളത്തെ കരുത്താണ്.', 'Today\'s pain is tomorrow\'s strength.'],
    ['പുസ്തകങ്ങളാണ് ഏറ്റവും നല്ല കൂട്ടുകാർ; അവ ഒരിക്കലും നിന്നെ കൈവിടില്ല.', 'Books are the best friends; they will never let you down.'],
    ['ലക്ഷ്യമില്ലാത്ത പഠനം ദിശയില്ലാത്ത യാത്രപോലെയാണ്. ഇന്നത്തെ ലക്ഷ്യം കുറിച്ചുവെക്കൂ.', 'Study without a goal is a journey without direction. Write down today\'s goal.'],
    ['ഓരോ "എനിക്ക് പറ്റില്ല"യും ഒരു "ഞാൻ ശ്രമിക്കും" ആക്കി മാറ്റൂ.', 'Turn every "I can\'t" into "I\'ll try".'],
    ['അൽപം വിശ്രമിക്കാം, പക്ഷേ ഒരിക്കലും ഉപേക്ഷിക്കരുത്.', 'Rest a little if you must, but never give up.'],
    ['ഇന്ന് നീ നട്ടുവളർത്തുന്ന അറിവാണ് നാളെ തണലേകുന്ന മരം.', 'The knowledge you plant today is the tree that gives you shade tomorrow.'],
    ['ഇരിക്കൂ, ശ്രദ്ധിക്കൂ, ജയിക്കൂ.', 'Sit down. Focus. Win.'],
    ['വിജയത്തിലേക്കുള്ള ലിഫ്റ്റ് കേടാണ്; പടികൾ കയറുക തന്നെ വേണം.', 'The lift to success is out of order; you have to take the stairs.'],
    ['നിന്റെ ഭാവി നിന്റെ കൈകളിലാണ് — ഇപ്പോൾ ആ കൈകളിൽ ഒരു പുസ്തകമുണ്ടാകട്ടെ.', 'Your future is in your hands — let those hands hold a book right now.'],
    ['ഇന്ന് പഠിക്കുന്ന ഓരോ വരിയും നാളെ നിനക്ക് പുതിയ വാതിലുകൾ തുറന്നുതരും.', 'Every line you study today will open new doors for you tomorrow.'],
    ['വിജയിച്ചവരെല്ലാം ഒരിക്കൽ തുടക്കക്കാരായിരുന്നു. ഇന്ന് തുടങ്ങൂ.', 'Everyone who succeeded was once a beginner. Start today.'],
    ['ചെറിയ ദിവസേനയുള്ള പഠനമാണ് വലിയ മാറ്റങ്ങൾ ഉണ്ടാക്കുന്നത്.', 'Small study every day is what creates big change.'],
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
self.quoteFor = function (day) {
    const n = self.QUOTES.length;
    return ((day % n) + n) % n;
};
self.taskFor = function (day) {
    const n = self.STUDY_TASKS.length;
    return (((day * 5) % n) + n) % n;
};
