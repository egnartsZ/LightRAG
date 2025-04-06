from pathlib import Path
import os
import json
from typing import Dict, Optional, Union, List

class PromptManager:
    def __init__(self, prompt_dir: str = "prompts"):
        self.prompt_dir = Path(__file__).parent / prompt_dir
        self.prompts: Dict[str, Union[str, List[str], Dict]] = {}
        self.load_prompts()

    def load_prompts(self) -> None:
        """Load all prompt files from the prompts directory"""
        # Load .txt files
        for prompt_file in self.prompt_dir.glob("*.txt"):
            prompt_name = prompt_file.stem
            with open(prompt_file, "r", encoding="utf-8") as f:
                self.prompts[prompt_name] = f.read()
                
        # Load .json files
        for prompt_file in self.prompt_dir.glob("*.json"):
            prompt_name = prompt_file.stem
            with open(prompt_file, "r", encoding="utf-8") as f:
                self.prompts[prompt_name] = json.load(f)

    def get_prompt(self, prompt_name: str) -> Optional[Union[str, List[str], Dict]]:
        """Get a prompt by name"""
        return self.prompts.get(prompt_name)

    def update_prompt(self, prompt_name: str, content: Union[str, List[str], Dict], is_json: bool = False) -> bool:
        """Update a prompt file and reload it
        
        Args:
            prompt_name: Name of the prompt
            content: Content to write
            is_json: Whether to save as JSON
        """
        try:
            # 기존 파일 확장자 확인
            existing_json = self.prompt_dir / f"{prompt_name}.json"
            existing_txt = self.prompt_dir / f"{prompt_name}.txt"
            
            if existing_json.exists():
                prompt_path = existing_json
                is_json = True
            elif existing_txt.exists():
                prompt_path = existing_txt
                is_json = False
            else:
                # 새 파일인 경우 is_json 파라미터에 따라 확장자 결정
                ext = ".json" if is_json else ".txt"
                prompt_path = self.prompt_dir / f"{prompt_name}{ext}"
            
            with open(prompt_path, "w", encoding="utf-8") as f:
                if is_json:
                    json.dump(content, f, ensure_ascii=False, indent=2)
                else:
                    f.write(content)
                    
            self.prompts[prompt_name] = content
            return True
        except Exception as e:
            print(f"Error updating prompt {prompt_name}: {e}")
            return False

    def list_prompts(self) -> Dict[str, Union[str, List[str], Dict]]:
        """List all available prompts"""
        return self.prompts 