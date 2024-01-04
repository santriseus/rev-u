(async function () {
    let testId = null;
    let state = null;

    function installCorrectnessDataAttributes(node) {
        const correctLabels = node.querySelectorAll('label[class^="mc-quiz-answer--correct"], label[class*=" mc-quiz-answer--correct"]');
        for (const label of correctLabels) {
            label.setAttribute('data-urmt-correct', '');
        }
        const incorrectLabels = node.querySelectorAll('label[class^="mc-quiz-answer--incorrect"], label[class*=" mc-quiz-answer--incorrect"]');
        for (const label of incorrectLabels) {
            label.setAttribute('data-urmt-incorrect', '');
        }

        const answers = node.querySelectorAll('label[class^="mc-quiz-answer"], label[class*=" mc-quiz-answer"]');
        for (const answer of answers) {
            answer.setAttribute('data-urmt-label', '');
        }
    }

    function isFormCorrect(form) {
        const labels = form.querySelectorAll("label");
        for (const label of labels) {
            const isSelected = label.getAttribute('data-urmt-selected-answer') === '';
            const isCorrect = label.getAttribute('data-urmt-correct') === '';
            if ((isSelected && !isCorrect) || (!isSelected && isCorrect)) {
                return false;
            }
        }
        return true;
    }

    async function isTurnedOff() {
        const {settings} = await chrome.storage.sync.get("settings")
        if (settings?.enabled === undefined) {
            await chrome.storage.sync.set({settings: {...settings, enabled: true}});
            return false;
        }
        return !settings.enabled;
    }

    async function initTestState() {
        const testIds = window.location.href.match(/quiz\/([0-9]+)\/result/);
        if (testIds.length < 2) {
            return;
        }
        testId = testIds[1];
        const testStateKey = "state:test:" + testId;
        const data = await chrome.storage.sync.get(testStateKey)
        state = data[testStateKey] || [];
    }

    async function updateTestState(newState) {
        const testStateKey = "state:test:" + testId;
        await chrome.storage.sync.set({[testStateKey]: newState})
        state = newState;
    }

    if (await isTurnedOff()) {
        console.log('Udemy review mode tests extension is turned off. To turn it on open the extension popup and turn on the switch');
        return;
    } else {
        console.log('Udemy review mode tests is turned on.');
    }

    async function install(node) {
        console.log('Injecting Udemy review mode tests extension changes.');
        await initTestState();
        node.setAttribute('data-urmt-enabled', '');
        installCorrectnessDataAttributes(node);
        const forms = node.querySelectorAll('form');
        const newState = [];
        for (const form of forms) {
            const stateEntry = {
                expanded: false,
                correct: false,
                mutiselect: false,
                selected: [], ...state[newState.length]
            };
            const input = form.querySelector("input");
            if (!input) {
                console.log('No inputs found');
                continue;
            }
            stateEntry.mutiselect = input.getAttribute && input.getAttribute('type') === 'checkbox';
            form.setAttribute('data-urmt-expanded', stateEntry.expanded);
            form.setAttribute('data-urmt-q-index', newState.length);
            form.setAttribute('data-urmt-is-correct', stateEntry.correct);
            const buttonContainer = document.createElement('div');
            buttonContainer.setAttribute('style', 'display: flex; justify-content: center;')
            const button = document.createElement('button')
            button.setAttribute('type', 'button');
            button.setAttribute('class', 'ud-btn ud-btn-small ud-btn-primary ud-heading-sm');
            button.setAttribute('style', 'margin-top: 16px');
            document.body.appendChild(buttonContainer);
            document.body.appendChild(button);
            buttonContainer.appendChild(button);
            form.insertBefore(buttonContainer, form.childNodes[form.childNodes.length - 1])
            button.onclick = async () => {
                const index = form.getAttribute('data-urmt-q-index');
                const newValue = !state[index].expanded;
                state[index] = {...state[index], expanded: newValue};
                await updateTestState(state);
                form.setAttribute('data-urmt-expanded', newValue)
            }
            const labels = form.querySelectorAll("label");
            let index = 0;
            for (const label of labels) {
                if (stateEntry.selected.includes(index)) {
                    label.setAttribute('data-urmt-selected-answer', '')
                }
                label.setAttribute('data-urmt-l-index', index);
                label.onclick = async () => {
                    const questionIndex = parseInt(form.getAttribute('data-urmt-q-index'));
                    const labelIndex = parseInt(label.getAttribute('data-urmt-l-index'));
                    console.log(`Clicked on question index ${questionIndex} label index ${labelIndex}`)
                    if (stateEntry.mutiselect) {
                        if (label.getAttribute('data-urmt-selected-answer') === '') {
                            state[questionIndex] = {
                                ...state[questionIndex], selected: state[questionIndex].selected.filter(function (idx) {
                                    return idx !== labelIndex;
                                })
                            }
                            label.removeAttribute('data-urmt-selected-answer')
                        } else {
                            label.setAttribute('data-urmt-selected-answer', '')
                            state[questionIndex].selected.push(labelIndex);
                        }
                    } else {
                        for (const lbl of labels) {
                            lbl.removeAttribute('data-urmt-selected-answer')
                            state[questionIndex].selected = [];
                        }
                        label.setAttribute('data-urmt-selected-answer', '')
                        state[questionIndex].selected = [labelIndex];
                    }
                    const correct = isFormCorrect(form);
                    state[questionIndex].correct = correct;
                    form.setAttribute('data-urmt-is-correct', correct);
                    await updateTestState(state);
                }
                index++;
            }
            newState.push(stateEntry);
        }
        await updateTestState(newState);
    }

    function foundContainerAndInstall() {
        const container = document.querySelector("body");
        if (!container) {
            return;
        }
        const observer = new MutationObserver(async (mutationList, observer) => {
            for (const mutation of mutationList) {
                if (mutation.type === "childList") {
                    for (const node of mutation.addedNodes) {
                        if (node?.getAttribute && node.getAttribute('data-purpose') === 'detailed-result-panel') {
                            observer.disconnect();
                            await install(node);
                        }
                    }

                }
            }
        });
        observer.observe(container, {
            childList: true,
            subtree: true,
        });
    }

    foundContainerAndInstall();
}());



