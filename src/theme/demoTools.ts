import { applyDemoDisplay, demoDisplay, reapplyCreatorTheme, saveDemoDisplay } from './demoDisplay';

function createDemoTools() {
  const dock = document.createElement('div');
  dock.className = 'demo-dock';
  dock.setAttribute('role', 'toolbar');
  dock.setAttribute('aria-label', 'Demo display options');
  dock.innerHTML =
    '<button type="button" class="btn btn-sm" data-demo-action="theme"></button>' +
    '<button type="button" class="btn btn-sm" data-demo-action="outlines"></button>';
  const themeButton = dock.querySelector<HTMLButtonElement>('[data-demo-action="theme"]')!;
  const outlinesButton = dock.querySelector<HTMLButtonElement>('[data-demo-action="outlines"]')!;

  function update() {
    const dark = demoDisplay.mode === 'dark';
    themeButton.innerHTML = `<i class="bi ${dark ? 'bi-moon' : 'bi-sun'}" aria-hidden="true"></i><span>${dark ? 'Dark' : 'Light'}</span>`;
    themeButton.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
    themeButton.title = `Switch to ${dark ? 'light' : 'dark'} theme`;
    outlinesButton.innerHTML = '<i class="bi bi-bounding-box" aria-hidden="true"></i><span>SurveyJS blocks</span>';
    outlinesButton.setAttribute('aria-pressed', String(demoDisplay.outlines));
    outlinesButton.title = `${demoDisplay.outlines ? 'Hide' : 'Show'} outlines around SurveyJS components`;
  }

  dock.addEventListener('click', (event) => {
    const action = (event.target as Element).closest<HTMLElement>('[data-demo-action]')?.dataset.demoAction;
    if (!action) return;
    if (action === 'theme') demoDisplay.mode = demoDisplay.mode === 'light' ? 'dark' : 'light';
    else demoDisplay.outlines = !demoDisplay.outlines;
    applyDemoDisplay();
    if (action === 'theme') reapplyCreatorTheme();
    saveDemoDisplay();
    update();
  });
  dock.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const target =
      event.key === 'Home' || (event.key === 'ArrowLeft' && document.activeElement === outlinesButton)
        ? themeButton
        : event.key === 'End' || (event.key === 'ArrowRight' && document.activeElement === themeButton)
          ? outlinesButton
          : document.activeElement === themeButton
            ? outlinesButton
            : themeButton;
    target.focus();
  });
  update();
  document.body.append(dock);

  return {
    mark(element: HTMLElement, label = 'SurveyJS') {
      element.dataset.surveyComponent = label;
    },
  };
}

export const demoTools = createDemoTools();
