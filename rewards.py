"""Reward tracking and management system."""

import json
import os
from typing import Dict, List, Tuple
from config import EMOJI_POINTS, DEFAULT_EMOJI_POINTS


class RewardTracker:
    """Tracks user rewards based on emoji reactions."""

    def __init__(self, storage_file: str = "rewards_data.json"):
        """Initialize the reward tracker.
        
        Args:
            storage_file: Path to the JSON file for storing rewards data
        """
        self.storage_file = storage_file
        self.rewards: Dict[str, int] = {}
        self.load_data()

    def load_data(self) -> None:
        """Load rewards data from storage file."""
        if os.path.exists(self.storage_file):
            try:
                with open(self.storage_file, 'r') as f:
                    self.rewards = json.load(f)
            except (json.JSONDecodeError, IOError):
                self.rewards = {}
        else:
            self.rewards = {}

    def save_data(self) -> None:
        """Save rewards data to storage file."""
        try:
            with open(self.storage_file, 'w') as f:
                json.dump(self.rewards, f, indent=2)
        except IOError as e:
            print(f"Error saving rewards data: {e}")

    def add_points(self, user_id: str, emoji: str) -> int:
        """Add points to a user for receiving an emoji reaction.
        
        Args:
            user_id: Slack user ID
            emoji: The emoji name (without colons)
            
        Returns:
            The number of points added
        """
        points = EMOJI_POINTS.get(emoji, DEFAULT_EMOJI_POINTS)
        current_points = self.rewards.get(user_id, 0)
        self.rewards[user_id] = current_points + points
        self.save_data()
        return points

    def remove_points(self, user_id: str, emoji: str) -> int:
        """Remove points from a user when an emoji reaction is removed.
        
        Args:
            user_id: Slack user ID
            emoji: The emoji name (without colons)
            
        Returns:
            The number of points removed
        """
        points = EMOJI_POINTS.get(emoji, DEFAULT_EMOJI_POINTS)
        current_points = self.rewards.get(user_id, 0)
        self.rewards[user_id] = max(0, current_points - points)
        self.save_data()
        return points

    def get_user_points(self, user_id: str) -> int:
        """Get the total points for a user.
        
        Args:
            user_id: Slack user ID
            
        Returns:
            Total points for the user
        """
        return self.rewards.get(user_id, 0)

    def get_leaderboard(self, limit: int = 10) -> List[Tuple[str, int]]:
        """Get the top users by points.
        
        Args:
            limit: Maximum number of users to return
            
        Returns:
            List of (user_id, points) tuples sorted by points descending
        """
        sorted_rewards = sorted(
            self.rewards.items(),
            key=lambda x: x[1],
            reverse=True
        )
        return sorted_rewards[:limit]

    def reset_user_points(self, user_id: str) -> None:
        """Reset a user's points to zero.
        
        Args:
            user_id: Slack user ID
        """
        if user_id in self.rewards:
            self.rewards[user_id] = 0
            self.save_data()

    def reset_all_points(self) -> None:
        """Reset all users' points to zero."""
        self.rewards = {}
        self.save_data()
