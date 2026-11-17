<div {{ $pb->attributes($block, $target, $isLink, $key)->class('pb-block pb-item pb-note-item') }}>
    <div class="pb-item__row">
        <div class="pb-item__main">
            <div class="pb-note">{{ $pb->title($target, $type) }}</div>
        </div>
    </div>
</div>
