"""PyTorch TrackNet architecture for tennis ball heatmap prediction."""

from pathlib import Path
from typing import Optional, Union
import torch
import torch.nn as nn


class ConvBlock(nn.Module):
    """Convolution + ReLU + BatchNorm module."""

    def __init__(
        self,
        in_channels: int,
        out_channels: int,
        kernel_size: int = 3,
        pad: int = 1,
        stride: int = 1,
        bias: bool = True,
    ):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(in_channels, out_channels, kernel_size, stride=stride, padding=pad, bias=bias),
            nn.ReLU(inplace=True),
            nn.BatchNorm2d(out_channels),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.block(x)


class BallTrackerNet(nn.Module):
    """VGG-style Encoder-Decoder network for sports ball localization.

    Takes 3 consecutive RGB video frames stacked into 9 channels (360x640),
    and predicts a 2D Gaussian heatmap over 256 quantization levels.
    """

    def __init__(self, in_channels: int = 9, out_channels: int = 256):
        super().__init__()
        self.in_channels = in_channels
        self.out_channels = out_channels

        # Encoder
        self.conv1 = ConvBlock(in_channels=in_channels, out_channels=64)
        self.conv2 = ConvBlock(in_channels=64, out_channels=64)
        self.pool1 = nn.MaxPool2d(kernel_size=2, stride=2)

        self.conv3 = ConvBlock(in_channels=64, out_channels=128)
        self.conv4 = ConvBlock(in_channels=128, out_channels=128)
        self.pool2 = nn.MaxPool2d(kernel_size=2, stride=2)

        self.conv5 = ConvBlock(in_channels=128, out_channels=256)
        self.conv6 = ConvBlock(in_channels=256, out_channels=256)
        self.conv7 = ConvBlock(in_channels=256, out_channels=256)
        self.pool3 = nn.MaxPool2d(kernel_size=2, stride=2)

        self.conv8 = ConvBlock(in_channels=256, out_channels=512)
        self.conv9 = ConvBlock(in_channels=512, out_channels=512)
        self.conv10 = ConvBlock(in_channels=512, out_channels=512)

        # Decoder
        self.ups1 = nn.Upsample(scale_factor=2, mode="nearest")
        self.conv11 = ConvBlock(in_channels=512, out_channels=256)
        self.conv12 = ConvBlock(in_channels=256, out_channels=256)
        self.conv13 = ConvBlock(in_channels=256, out_channels=256)

        self.ups2 = nn.Upsample(scale_factor=2, mode="nearest")
        self.conv14 = ConvBlock(in_channels=256, out_channels=128)
        self.conv15 = ConvBlock(in_channels=128, out_channels=128)

        self.ups3 = nn.Upsample(scale_factor=2, mode="nearest")
        self.conv16 = ConvBlock(in_channels=128, out_channels=64)
        self.conv17 = ConvBlock(in_channels=64, out_channels=64)
        self.conv18 = ConvBlock(in_channels=64, out_channels=out_channels)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.conv1(x)
        x = self.conv2(x)
        x = self.pool1(x)

        x = self.conv3(x)
        x = self.conv4(x)
        x = self.pool2(x)

        x = self.conv5(x)
        x = self.conv6(x)
        x = self.conv7(x)
        x = self.pool3(x)

        x = self.conv8(x)
        x = self.conv9(x)
        x = self.conv10(x)

        x = self.ups1(x)
        x = self.conv11(x)
        x = self.conv12(x)
        x = self.conv13(x)

        x = self.ups2(x)
        x = self.conv14(x)
        x = self.conv15(x)

        x = self.ups3(x)
        x = self.conv16(x)
        x = self.conv17(x)
        x = self.conv18(x)
        return x

    @classmethod
    def from_pretrained(
        cls, weights_path: Union[str, Path], device: Optional[torch.device] = None
    ) -> "BallTrackerNet":
        """Instantiate BallTrackerNet and load checkpoint state dict."""
        weights_path = Path(weights_path).resolve()
        if not weights_path.exists():
            raise FileNotFoundError(f"Checkpoint weights not found: {weights_path}")

        if device is None:
            if torch.backends.mps.is_available():
                device = torch.device("mps")
            elif torch.cuda.is_available():
                device = torch.device("cuda")
            else:
                device = torch.device("cpu")

        model = cls(in_channels=9, out_channels=256)
        state_dict = torch.load(str(weights_path), map_location=device)
        model.load_state_dict(state_dict)
        model.to(device)
        model.eval()
        return model
