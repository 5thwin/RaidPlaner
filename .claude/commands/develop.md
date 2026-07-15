---
description: developer 서브에이전트에게 기능/코드 구현을 위임합니다. 항상 .claude/skills/ 아래의 md 규칙을 따릅니다.
argument-hint: <구현할 기능이나 수정 내용>
allowed-tools: Agent, Read, Glob, Bash
---

다음 요청을 `developer` 서브에이전트에게 위임해서 구현하세요.

요청 내용: $ARGUMENTS

- Agent 도구로 subagent_type "developer"를 foreground로 실행해서, 완료될 때까지 기다린 뒤 결과를 확인하세요.
- 서브에이전트에게 전달하는 프롬프트에는 반드시 다음을 포함하세요:
  - 사용자의 요청 원문 (위의 요청 내용)
  - "시작 전에 `.claude/skills/` 폴더 아래의 모든 `.md` 파일을 읽고, 그 내용을 프로젝트 규칙으로 따를 것" (특정 파일명을 하드코딩하지 말고 폴더 전체를 스캔하도록 지시)
  - 프로젝트 배경: my-raid-planner, 로스트아크(Lost Ark) 공격대 파티 플래너, React 19 + TypeScript + Vite + Tailwind v4 + React Router 7
- 서브에이전트 작업이 끝나면, 무엇을 구현/변경했는지 사용자에게 간단히 요약해서 보고하세요.
