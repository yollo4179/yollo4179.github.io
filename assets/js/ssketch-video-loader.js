document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.ssketch-video-load').forEach((button) => {
    button.addEventListener('click', async () => {
      const shell = button.closest('.ssketch-video-shell');
      const video = shell.querySelector('video');
      const status = shell.querySelector('.ssketch-video-status');
      const url = button.dataset.videoSrc;

      button.disabled = true;
      button.textContent = '영상을 불러오는 중…';
      status.textContent = '파일을 읽고 있습니다.';
      shell.setAttribute('aria-busy', 'true');

      try {
        const response = await fetch(url, {cache: 'no-store'});
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const total = Number(response.headers.get('Content-Length')) || 0;
        const reader = response.body.getReader();
        const chunks = [];
        let loaded = 0;
        while (true) {
          const {done, value} = await reader.read();
          if (done) break;
          chunks.push(value);
          loaded += value.byteLength;
          if (total) button.textContent = `불러오는 중 ${Math.floor(loaded / total * 100)}%`;
        }

        const blob = new Blob(chunks, {type: 'video/mp4'});
        video.src = URL.createObjectURL(blob);
        video.load();
        shell.classList.add('ssketch-video-shell--ready');
        button.hidden = true;
        status.textContent = '';

        try {
          await video.play();
        } catch (error) {
          status.textContent = '영상이 준비됐습니다. 플레이어의 재생 버튼을 눌러주세요.';
        }
      } catch (error) {
        button.disabled = false;
        button.textContent = '다시 불러오기';
        status.textContent = '영상을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';
      } finally {
        shell.removeAttribute('aria-busy');
      }
    });
  });
});
