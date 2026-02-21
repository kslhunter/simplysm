모든 컴포넌트를 하나씩 확인하면서 슬롯을 사용하는게 낫겠다 싶은 컴포넌트 찾아봐
예를들면 Select라면
<Select items={...} render={(item) => ...}>
    <Select.Item>null</Select.Item>
    <Select.Items/>
    <Select.Item value={end}>end</Select.Item>
</Select>

이런식이랄까? 예로 든거고.. 뭐가 옳을지는 나도 몰라