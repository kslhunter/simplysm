value, onValueChange


- sheet cell header line doubleclick 으로 cell크기 auto로 변경
- sheet edit 모드 관련 기능 지우고, 각 field등의 컴포넌트에서 readonly 다 없애기.
  - sheet page도 edit mode없이 전부 그냥 바로 inset component넣는걸로.
  - DateTime, Date, Time에 dual 필요없음. 너비 고정이므로 input만 있으면됨 (div로 감쌀 필요도 없음)
    - 물론 Textfield같은건 너비가 고정이 아니므로 div가 크기를 정해주고 input이 그 크기에 맞춰지는 현재의 로직 그대로 필요함