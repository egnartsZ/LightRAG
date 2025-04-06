"""
This module contains all prompt-related routes for the LightRAG API.
"""

import logging
from typing import Dict, Optional, Union, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..utils_api import get_combined_auth_dependency
from ...prompt_manager import PromptManager

router = APIRouter(tags=["prompts"])


class PromptUpdate(BaseModel):
    content: Union[str, List[str], Dict] = Field(
        description="The prompt content to update"
    )
    is_json: bool = Field(
        default=False,
        description="Whether the content is JSON"
    )


def create_prompt_routes(prompt_manager: Optional[PromptManager] = None, api_key: Optional[str] = None):
    """프롬프트 관련 라우트를 생성합니다."""
    
    if prompt_manager is None:
        prompt_manager = PromptManager()
    
    _prompt_manager = prompt_manager
    
    # Create combined auth dependency for prompt routes
    combined_auth = get_combined_auth_dependency(api_key)
    
    @router.get("/prompts", dependencies=[Depends(combined_auth)])
    async def get_prompts() -> Dict[str, Union[str, List[str], Dict]]:
        """
        모든 프롬프트를 가져옵니다.
        
        Returns:
            Dict[str, Union[str, List[str], Dict]]: 프롬프트 이름과 내용의 딕셔너리
        """
        return _prompt_manager.prompts
    
    @router.put("/prompts/{prompt_name}", dependencies=[Depends(combined_auth)])
    async def update_prompt(prompt_name: str, prompt_update: PromptUpdate) -> Union[str, List[str], Dict]:
        """
        프롬프트 내용을 업데이트합니다.
        
        Args:
            prompt_name (str): 프롬프트 이름
            prompt_update (PromptUpdate): 업데이트할 프롬프트 내용
            
        Returns:
            Union[str, List[str], Dict]: 업데이트된 프롬프트 내용
            
        Raises:
            HTTPException: 업데이트 실패 시
        """
        try:
            success = _prompt_manager.update_prompt(
                prompt_name, 
                prompt_update.content,
                is_json=prompt_update.is_json
            )
            if not success:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to update prompt '{prompt_name}'"
                )
            return prompt_update.content
        except HTTPException:
            raise
        except Exception as e:
            logging.error(f"Failed to update prompt {prompt_name}: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to update prompt: {str(e)}"
            )
    
    return router 