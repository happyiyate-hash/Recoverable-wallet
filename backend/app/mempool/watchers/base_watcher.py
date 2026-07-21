from abc import ABC, abstractmethod

class BaseWatcher(ABC):
    @abstractmethod
    async def start(self):
        """Starts the watcher connection to the provider."""
        pass

    @abstractmethod
    async def stop(self):
        """Stops the watcher connection."""
        pass

    @abstractmethod
    def add_address(self, address: str):
        """Adds an address to the watched list."""
        pass

    @abstractmethod
    def remove_address(self, address: str):
        """Removes an address from the watched list."""
        pass
