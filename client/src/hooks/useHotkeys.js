import { useHotkeys } from 'react-hotkeys-hook';

export default function useEditorHotkeys(actions) {
  useHotkeys('cmd+k,ctrl+k', actions.onAICommand, { enableOnTags: ['TEXTAREA', 'INPUT', 'DIV'] });
  useHotkeys('cmd+p,ctrl+p', actions.onGoToFile);
  useHotkeys('cmd+shift+f,ctrl+shift+f', actions.onSearchProject);
  useHotkeys('cmd+shift+k,ctrl+shift+k', actions.onAskAIAboutSelection);
}
